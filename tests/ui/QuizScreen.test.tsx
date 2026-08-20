import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { QuizScreen } from '../../src/ui/screens/QuizScreen';
import { putCard, getCard, openDb } from '../../src/data/db';
import type { Card } from '../../src/core/types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'a', hanzi: '你好', zhuyin: 'ㄋㄧˇㄏㄠˇ', zhuyinEdited: false, meaning: 'こんにちは',
    tags: [], note: '', examples: [],
    srs: { due: '2026-08-20', interval: 0, ease: 2.5, reps: 0, lapses: 0 },
    createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(async () => {
  const db = await openDb();
  await db.clear('cards');
  Object.defineProperty(window, 'speechSynthesis', {
    value: { getVoices: () => [], speak: () => {}, cancel: () => {}, addEventListener: () => {} },
    writable: true,
  });
});

test('hanzi-to-meaning: shows hanzi, hides meaning until flipped, grading advances and saves srs', async () => {
  await putCard(makeCard());
  render(<QuizScreen />);
  await waitFor(() => screen.getByText('開始'));
  fireEvent.click(screen.getByLabelText('中文 → 意味'));
  fireEvent.click(screen.getByText('開始'));

  await waitFor(() => screen.getByText('你好'));
  expect(screen.queryByText('こんにちは')).not.toBeInTheDocument();

  fireEvent.click(screen.getByText('答えを見る'));
  expect(screen.getByText('こんにちは')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '普通' }));

  await waitFor(async () => {
    const saved = await getCard('a');
    expect(saved!.srs.interval).toBe(1);
  });
});

test('audio-to-meaning mode never renders the hanzi text', async () => {
  await putCard(makeCard());
  render(<QuizScreen />);
  await waitFor(() => screen.getByText('開始'));
  fireEvent.click(screen.getByLabelText('音声 → 意味'));
  fireEvent.click(screen.getByText('開始'));

  await waitFor(() => screen.getByRole('button', { name: '答えを見る' }));
  expect(screen.queryByText('你好')).not.toBeInTheDocument();

  fireEvent.click(screen.getByText('答えを見る'));
  expect(screen.getByText('こんにちは')).toBeInTheDocument();
  expect(screen.queryByText('你好')).not.toBeInTheDocument();
});
