import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { ListScreen } from '../../src/ui/screens/ListScreen';
import { putCard, openDb } from '../../src/data/db';
import type { Card } from '../../src/core/types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'a', hanzi: '你好', zhuyin: 'ㄋㄧˇㄏㄠˇ', zhuyinEdited: false, meaning: 'こんにちは',
    tags: ['挨拶'], note: '', examples: [],
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

test('lists stored cards and filters by search text', async () => {
  await putCard(makeCard({ id: 'a', hanzi: '你好' }));
  await putCard(makeCard({ id: 'b', hanzi: '謝謝' }));
  render(<ListScreen onOpenCard={() => {}} />);
  await waitFor(() => expect(screen.getByText('你好')).toBeInTheDocument());
  expect(screen.getByText('謝謝')).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText('検索'), { target: { value: '謝' } });
  expect(screen.queryByText('你好')).not.toBeInTheDocument();
  expect(screen.getByText('謝謝')).toBeInTheDocument();
});

test('tapping the add button opens the edit screen for a new card', async () => {
  const onOpenCard = vi.fn();
  render(<ListScreen onOpenCard={onOpenCard} />);
  fireEvent.click(screen.getByRole('button', { name: '＋' }));
  expect(onOpenCard).toHaveBeenCalledWith(null);
});

test('tapping a row opens that card for editing', async () => {
  await putCard(makeCard({ id: 'a', hanzi: '你好' }));
  const onOpenCard = vi.fn();
  render(<ListScreen onOpenCard={onOpenCard} />);
  await waitFor(() => screen.getByText('你好'));
  fireEvent.click(screen.getByText('你好'));
  expect(onOpenCard).toHaveBeenCalledWith('a');
});

const IMAGE = 'data:image/webp;base64,AAAA';

test('the image button only appears for cards that have one', async () => {
  await putCard(makeCard({ id: 'a', hanzi: '你好' }));
  await putCard(makeCard({ id: 'b', hanzi: '謝謝', image: IMAGE }));
  render(<ListScreen onOpenCard={() => {}} />);
  await waitFor(() => expect(screen.getByLabelText('謝謝 の画像を表示')).toBeInTheDocument());
  expect(screen.queryByLabelText('你好 の画像を表示')).not.toBeInTheDocument();
});

test('tapping the image button shows the image and tapping it again hides it', async () => {
  const onOpenCard = vi.fn();
  await putCard(makeCard({ id: 'b', hanzi: '謝謝', image: IMAGE }));
  render(<ListScreen onOpenCard={onOpenCard} />);
  await waitFor(() => expect(screen.getByLabelText('謝謝 の画像を表示')).toBeInTheDocument());

  fireEvent.click(screen.getByLabelText('謝謝 の画像を表示'));
  expect(screen.getByAltText('謝謝 の画像')).toHaveAttribute('src', IMAGE);
  // Opening the image must not also open the card for editing.
  expect(onOpenCard).not.toHaveBeenCalled();

  fireEvent.click(screen.getByLabelText('画像を閉じる'));
  expect(screen.queryByAltText('謝謝 の画像')).not.toBeInTheDocument();
});
