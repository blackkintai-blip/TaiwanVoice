export function pickTaiwaneseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const exact = voices.find((v) => v.lang.toLowerCase() === 'zh-tw');
  if (exact) return exact;
  const hant = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === 'zh-hant');
  return hant ?? null;
}

const SPLIT_PATTERN = /[。！？，、；：\n]+/;

export function splitIntoChunks(text: string): string[] {
  return text
    .split(SPLIT_PATTERN)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

type SpeechQueueOptions = {
  rate?: number;
  onDone?: () => void;
  utteranceFactory?: (text: string) => SpeechSynthesisUtterance;
};

export class SpeechQueue {
  private synth: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null;
  private rate: number;
  private onDone?: () => void;
  private makeUtterance: (text: string) => SpeechSynthesisUtterance;
  private pending: string[] = [];
  private speaking = false;
  private stopped = true;

  constructor(synth: SpeechSynthesis, voice: SpeechSynthesisVoice | null, opts: SpeechQueueOptions = {}) {
    this.synth = synth;
    this.voice = voice;
    this.rate = opts.rate ?? 1;
    this.onDone = opts.onDone;
    this.makeUtterance = opts.utteranceFactory ?? ((text) => new SpeechSynthesisUtterance(text));
  }

  get isSpeaking(): boolean {
    return this.speaking;
  }

  enqueue(text: string): void {
    this.pending.push(...splitIntoChunks(text));
  }

  start(): void {
    this.stopped = false;
    this.speakNext();
  }

  stop(): void {
    this.stopped = true;
    this.speaking = false;
    this.pending = [];
    this.synth.cancel();
  }

  private speakNext(): void {
    if (this.stopped) return;
    const next = this.pending.shift();
    if (next === undefined) {
      this.speaking = false;
      this.onDone?.();
      return;
    }
    this.speaking = true;
    const utterance = this.makeUtterance(next);
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = this.rate;
    utterance.onend = () => {
      if (this.stopped) return;
      this.speakNext();
    };
    this.synth.speak(utterance);
  }
}

type PlayRepeatedOptions = {
  rate: number;
  repeatCount: number;
  gapMs: number;
  onAllDone?: () => void;
  scheduleGap?: (fn: () => void, ms: number) => number;
  cancelGap?: (handle: number) => void;
  queueFactory?: (
    synth: SpeechSynthesis,
    voice: SpeechSynthesisVoice | null,
    opts: { rate: number; onDone?: () => void },
  ) => SpeechQueue;
};

export function playRepeated(
  synth: SpeechSynthesis,
  voice: SpeechSynthesisVoice | null,
  items: string[],
  opts: PlayRepeatedOptions,
): { stop: () => void } {
  const scheduleGap = opts.scheduleGap ?? ((fn, ms) => setTimeout(fn, ms) as unknown as number);
  const cancelGap = opts.cancelGap ?? ((handle) => clearTimeout(handle as unknown as ReturnType<typeof setTimeout>));
  const makeQueue = opts.queueFactory ?? ((s, v, o) => new SpeechQueue(s, v, o));

  let itemIndex = 0;
  let repeatIndex = 0;
  let stopped = false;
  let gapHandle: number | null = null;
  let currentQueue: SpeechQueue | null = null;

  function playNext() {
    if (stopped) return;
    if (itemIndex >= items.length) {
      opts.onAllDone?.();
      return;
    }
    currentQueue = makeQueue(synth, voice, {
      rate: opts.rate,
      onDone: () => {
        if (stopped) return;
        repeatIndex += 1;
        if (repeatIndex >= opts.repeatCount) {
          repeatIndex = 0;
          itemIndex += 1;
        }
        gapHandle = scheduleGap(playNext, opts.gapMs);
      },
    });
    currentQueue.enqueue(items[itemIndex]);
    currentQueue.start();
  }

  playNext();

  return {
    stop() {
      stopped = true;
      if (gapHandle !== null) cancelGap(gapHandle);
      currentQueue?.stop();
    },
  };
}
