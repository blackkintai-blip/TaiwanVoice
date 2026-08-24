import { startMicRecording } from '../../src/audio/recorder';

class FakeTrack {
  stopped = false;
  stop() {
    this.stopped = true;
  }
}

class FakeStream {
  tracks: FakeTrack[];
  constructor(count = 1) {
    this.tracks = Array.from({ length: count }, () => new FakeTrack());
  }
  getTracks() {
    return this.tracks;
  }
}

class FakeMediaRecorder {
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(public stream: FakeStream) {}
  start() {
    this.state = 'recording';
  }
  stop() {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['x']) });
    this.onstop?.();
  }
}

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  URL.createObjectURL = (() => 'blob:fake-url') as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
});

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

test('start() requests the mic, records, and stop() resolves a blob url while releasing the mic', async () => {
  const stream = new FakeStream(2);
  let recorder!: FakeMediaRecorder;
  const handle = await startMicRecording({
    getUserMedia: async () => stream as unknown as MediaStream,
    mediaRecorderFactory: (s) => {
      recorder = new FakeMediaRecorder(s as unknown as FakeStream);
      return recorder as unknown as MediaRecorder;
    },
  });

  expect(recorder.state).toBe('recording');
  handle.stop();

  const result = await handle.result;
  expect(result.url).toBe('blob:fake-url');
  expect(stream.tracks.every((t) => t.stopped)).toBe(true);
});

test('auto-stops after maxDurationMs and still resolves', async () => {
  vi.useFakeTimers();
  const stream = new FakeStream();
  const handle = await startMicRecording({
    maxDurationMs: 15000,
    getUserMedia: async () => stream as unknown as MediaStream,
    mediaRecorderFactory: (s) => new FakeMediaRecorder(s as unknown as FakeStream) as unknown as MediaRecorder,
  });

  const resultPromise = handle.result;
  vi.advanceTimersByTime(15000);
  vi.useRealTimers();

  const result = await resultPromise;
  expect(result.url).toBe('blob:fake-url');
  expect(stream.tracks[0].stopped).toBe(true);
});
