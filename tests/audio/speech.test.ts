import { pickTaiwaneseVoice, splitIntoChunks, SpeechQueue, playRepeated } from '../../src/audio/speech';

function makeVoice(lang: string, name = lang): SpeechSynthesisVoice {
  return { lang, name, voiceURI: name, default: false, localService: true } as SpeechSynthesisVoice;
}

test('pickTaiwaneseVoice prefers an exact zh-TW voice', () => {
  const voices = [makeVoice('zh-CN'), makeVoice('zh-TW'), makeVoice('en-US')];
  expect(pickTaiwaneseVoice(voices)?.lang).toBe('zh-TW');
});

test('pickTaiwaneseVoice falls back to zh-Hant when no zh-TW voice exists', () => {
  const voices = [makeVoice('zh-CN'), makeVoice('zh-Hant')];
  expect(pickTaiwaneseVoice(voices)?.lang).toBe('zh-Hant');
});

test('pickTaiwaneseVoice never returns a zh-CN voice', () => {
  const voices = [makeVoice('zh-CN')];
  expect(pickTaiwaneseVoice(voices)).toBeNull();
});

test('pickTaiwaneseVoice returns null when there is no voice list at all', () => {
  expect(pickTaiwaneseVoice([])).toBeNull();
});

test('splitIntoChunks splits on Chinese punctuation and drops empty pieces', () => {
  expect(splitIntoChunks('你好，今天天氣很好。謝謝！')).toEqual(['你好', '今天天氣很好', '謝謝']);
});

test('splitIntoChunks returns the whole string when there is no punctuation', () => {
  expect(splitIntoChunks('你好')).toEqual(['你好']);
});

class FakeUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) { this.text = text; }
}

function makeFakeSynth() {
  const spoken: string[] = [];
  let current: FakeUtterance | null = null;
  const synth = {
    speak(utterance: FakeUtterance) {
      current = utterance;
      spoken.push(utterance.text);
    },
    cancel() {
      current = null;
    },
    finishCurrent() {
      const u = current;
      current = null;
      u?.onend?.();
    },
  };
  return { synth: synth as unknown as SpeechSynthesis, spoken, finishCurrent: synth.finishCurrent };
}

test('SpeechQueue speaks chunks of one enqueued text back-to-back', () => {
  const { synth, spoken, finishCurrent } = makeFakeSynth();
  const voice = makeVoice('zh-TW');
  const queue = new SpeechQueue(synth, voice, {
    utteranceFactory: (text: string) => new FakeUtterance(text) as unknown as SpeechSynthesisUtterance,
  } as never);
  queue.enqueue('你好，世界');
  queue.start();
  expect(spoken).toEqual(['你好']);
  finishCurrent();
  expect(spoken).toEqual(['你好', '世界']);
});

test('SpeechQueue.stop cancels playback and prevents further chunks from starting', () => {
  const { synth, spoken, finishCurrent } = makeFakeSynth();
  const voice = makeVoice('zh-TW');
  const queue = new SpeechQueue(synth, voice, {
    utteranceFactory: (text: string) => new FakeUtterance(text) as unknown as SpeechSynthesisUtterance,
  } as never);
  queue.enqueue('你好，世界');
  queue.start();
  queue.stop();
  finishCurrent();
  expect(spoken).toEqual(['你好']);
  expect(queue.isSpeaking).toBe(false);
});

test('SpeechQueue enqueues multiple texts in order across their own chunk splits', () => {
  const { synth, spoken, finishCurrent } = makeFakeSynth();
  const voice = makeVoice('zh-TW');
  const queue = new SpeechQueue(synth, voice, {
    utteranceFactory: (text: string) => new FakeUtterance(text) as unknown as SpeechSynthesisUtterance,
  } as never);
  queue.enqueue('一，二');
  queue.enqueue('三');
  queue.start();
  finishCurrent();
  finishCurrent();
  expect(spoken).toEqual(['一', '二', '三']);
});

test('SpeechQueue calls onDone exactly once after the last chunk finishes naturally', () => {
  const { synth, finishCurrent } = makeFakeSynth();
  const voice = makeVoice('zh-TW');
  const onDone = vi.fn();
  const queue = new SpeechQueue(synth, voice, {
    onDone,
    utteranceFactory: (text: string) => new FakeUtterance(text) as unknown as SpeechSynthesisUtterance,
  } as never);
  queue.enqueue('一，二');
  queue.start();
  finishCurrent();
  expect(onDone).not.toHaveBeenCalled();
  finishCurrent();
  expect(onDone).toHaveBeenCalledTimes(1);
});

test('SpeechQueue does not call onDone when stopped early', () => {
  const { synth, finishCurrent } = makeFakeSynth();
  const voice = makeVoice('zh-TW');
  const onDone = vi.fn();
  const queue = new SpeechQueue(synth, voice, {
    onDone,
    utteranceFactory: (text: string) => new FakeUtterance(text) as unknown as SpeechSynthesisUtterance,
  } as never);
  queue.enqueue('一，二');
  queue.start();
  queue.stop();
  finishCurrent();
  expect(onDone).not.toHaveBeenCalled();
});

function makeQueueFactory() {
  return (s: SpeechSynthesis, v: SpeechSynthesisVoice | null, o: { rate: number; onDone?: () => void }) =>
    new SpeechQueue(s, v, { ...o, utteranceFactory: (t: string) => new FakeUtterance(t) as unknown as SpeechSynthesisUtterance } as never);
}

test('playRepeated plays each item repeatCount times before advancing, with a gap between', () => {
  const { synth, spoken, finishCurrent } = makeFakeSynth();
  const voice = makeVoice('zh-TW');
  const gapCalls: number[] = [];
  playRepeated(synth, voice, ['你好', '再見'], {
    rate: 1,
    repeatCount: 2,
    gapMs: 1500,
    scheduleGap: (fn, ms) => { gapCalls.push(ms); fn(); return 0; },
    cancelGap: () => {},
    queueFactory: makeQueueFactory(),
  });
  expect(spoken).toEqual(['你好']);
  finishCurrent();
  expect(spoken).toEqual(['你好', '你好']);
  finishCurrent();
  expect(spoken).toEqual(['你好', '你好', '再見']);
  expect(gapCalls).toEqual([1500, 1500]);
});

test('playRepeated calls onAllDone after the last item finishes its repeats', () => {
  const { synth, finishCurrent } = makeFakeSynth();
  const voice = makeVoice('zh-TW');
  const onAllDone = vi.fn();
  playRepeated(synth, voice, ['你好'], {
    rate: 1,
    repeatCount: 1,
    gapMs: 0,
    scheduleGap: (fn) => { fn(); return 0; },
    cancelGap: () => {},
    onAllDone,
    queueFactory: makeQueueFactory(),
  });
  finishCurrent();
  expect(onAllDone).toHaveBeenCalledTimes(1);
});

test('playRepeated.stop() prevents any further playback', () => {
  const { synth, spoken, finishCurrent } = makeFakeSynth();
  const voice = makeVoice('zh-TW');
  const session = playRepeated(synth, voice, ['你好', '再見'], {
    rate: 1,
    repeatCount: 1,
    gapMs: 0,
    scheduleGap: (fn) => { fn(); return 0; },
    cancelGap: () => {},
    queueFactory: makeQueueFactory(),
  });
  session.stop();
  finishCurrent();
  expect(spoken).toEqual(['你好']);
});
