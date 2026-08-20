import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement the Web Speech API. Screens construct real
// SpeechSynthesisUtterance instances when the user taps a speak button;
// without this stub those tests crash with "SpeechSynthesisUtterance is
// not defined" even though window.speechSynthesis itself is mocked
// per-test. Unit tests for SpeechQueue/playRepeated inject their own fake
// utteranceFactory and don't rely on this global.
if (typeof globalThis.SpeechSynthesisUtterance === 'undefined') {
  class FakeSpeechSynthesisUtterance {
    text: string;
    voice: unknown = null;
    rate = 1;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  // @ts-expect-error -- test-only global polyfill, not a full spec implementation
  globalThis.SpeechSynthesisUtterance = FakeSpeechSynthesisUtterance;
}
