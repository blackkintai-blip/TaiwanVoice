export type RecordResult = { url: string; blob: Blob };

export type RecordingHandle = {
  result: Promise<RecordResult>;
  stop: () => void;
};

type StartMicRecordingOptions = {
  maxDurationMs?: number;
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  mediaRecorderFactory?: (stream: MediaStream) => MediaRecorder;
};

export function supportsMicRecording(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export async function startMicRecording(opts: StartMicRecordingOptions = {}): Promise<RecordingHandle> {
  const getUserMedia = opts.getUserMedia ?? ((c) => navigator.mediaDevices.getUserMedia(c));
  const makeRecorder = opts.mediaRecorderFactory ?? ((s) => new MediaRecorder(s));
  const maxDurationMs = opts.maxDurationMs ?? 15000;

  const stream = await getUserMedia({ audio: true });
  const recorder = makeRecorder(stream);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const result = new Promise<RecordResult>((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      resolve({ url: URL.createObjectURL(blob), blob });
    };
  });

  const timer = setTimeout(() => {
    if (recorder.state !== 'inactive') recorder.stop();
  }, maxDurationMs);

  recorder.start();

  return {
    result,
    stop: () => {
      clearTimeout(timer);
      if (recorder.state !== 'inactive') recorder.stop();
    },
  };
}
