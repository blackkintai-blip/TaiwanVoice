import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { ListenScreen } from '../../src/ui/screens/ListenScreen';
import { putCard, openDb } from '../../src/data/db';
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

test('card text is hidden until the reveal button is held', async () => {
  await putCard(makeCard());
  render(<ListenScreen />);
  await waitFor(() => screen.getByRole('button', { name: '再生' }));

  expect(screen.queryByText('你好')).not.toBeInTheDocument();

  const reveal = screen.getByRole('button', { name: '文字を見る' });
  fireEvent.pointerDown(reveal);
  expect(screen.getByText('你好')).toBeInTheDocument();

  fireEvent.pointerUp(reveal);
  expect(screen.queryByText('你好')).not.toBeInTheDocument();
});

test('shows a counter and next/prev controls', async () => {
  await putCard(makeCard({ id: 'a' }));
  await putCard(makeCard({ id: 'b', hanzi: '謝謝' }));
  render(<ListenScreen />);
  await waitFor(() => screen.getByText('1 / 2'));

  fireEvent.click(screen.getByRole('button', { name: '次' }));
  expect(screen.getByText('2 / 2')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '前' }));
  expect(screen.getByText('1 / 2')).toBeInTheDocument();
});
