import 'fake-indexeddb/auto';
import { listCards, putCard, getCard, deleteCard, putCards, openDb } from '../../src/data/db';
import type { Card } from '../../src/core/types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: overrides.id ?? 'card-1',
    hanzi: '你好',
    zhuyin: 'ㄋㄧˇㄏㄠˇ',
    zhuyinEdited: false,
    meaning: 'こんにちは',
    tags: [],
    note: '',
    examples: [],
    srs: { due: '2026-08-20', interval: 0, ease: 2.5, reps: 0, lapses: 0 },
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(async () => {
  const db = await openDb();
  await db.clear('cards');
});

test('putCard then getCard round-trips', async () => {
  const card = makeCard();
  await putCard(card);
  const loaded = await getCard(card.id);
  expect(loaded).toEqual(card);
});

test('listCards returns all stored cards', async () => {
  await putCard(makeCard({ id: 'a' }));
  await putCard(makeCard({ id: 'b' }));
  const all = await listCards();
  expect(all.map((c) => c.id).sort()).toEqual(['a', 'b']);
});

test('deleteCard removes a card', async () => {
  await putCard(makeCard({ id: 'to-delete' }));
  await deleteCard('to-delete');
  expect(await getCard('to-delete')).toBeUndefined();
});

test('putCards bulk-upserts', async () => {
  await putCards([makeCard({ id: 'x' }), makeCard({ id: 'y' })]);
  const all = await listCards();
  expect(all.some((c) => c.id === 'x')).toBe(true);
  expect(all.some((c) => c.id === 'y')).toBe(true);
});
