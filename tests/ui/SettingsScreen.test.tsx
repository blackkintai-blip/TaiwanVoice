import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { SettingsScreen } from '../../src/ui/screens/SettingsScreen';
import { putCard, getCard, openDb } from '../../src/data/db';
import type { Card } from '../../src/core/types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'a', hanzi: '你好', zhuyin: '', zhuyinEdited: false, meaning: 'こんにちは',
    tags: [], note: '', examples: [],
    srs: { due: '2026-08-20', interval: 0, ease: 2.5, reps: 0, lapses: 0 },
    createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z',
    ...overrides,
  };
}

function mockSynth(voices: SpeechSynthesisVoice[]) {
  Object.defineProperty(window, 'speechSynthesis', {
    value: { getVoices: () => voices, speak: () => {}, cancel: () => {}, addEventListener: () => {} },
    writable: true,
  });
}

const originalFetch = globalThis.fetch;
beforeEach(async () => {
  const db = await openDb();
  await db.clear('cards');
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ '你好': 'ㄋㄧˇㄏㄠˇ' }),
  }) as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('shows install instructions when no Taiwanese voice is available', async () => {
  mockSynth([{ lang: 'zh-CN', name: 'x', voiceURI: 'x', default: false, localService: true } as SpeechSynthesisVoice]);
  render(<SettingsScreen />);
  expect(await screen.findByText(/台湾華語の音声が見つかりません/)).toBeInTheDocument();
});

test('does not show install instructions when a zh-TW voice is available', async () => {
  mockSynth([{ lang: 'zh-TW', name: 'x', voiceURI: 'x', default: false, localService: true } as SpeechSynthesisVoice]);
  render(<SettingsScreen />);
  await waitFor(() => screen.getByText('設定'));
  expect(screen.queryByText(/台湾華語の音声が見つかりません/)).not.toBeInTheDocument();
});

test('reapplying the dictionary fills in zhuyin for unedited cards', async () => {
  mockSynth([{ lang: 'zh-TW', name: 'x', voiceURI: 'x', default: false, localService: true } as SpeechSynthesisVoice]);
  await putCard(makeCard());
  render(<SettingsScreen />);
  const reapplyButton = await screen.findByText('辞書を再適用');
  await waitFor(() => expect(reapplyButton).not.toBeDisabled());
  fireEvent.click(reapplyButton);
  await waitFor(async () => {
    const saved = await getCard('a');
    expect(saved!.zhuyin).toBe('ㄋㄧˇㄏㄠˇ');
  });
});
