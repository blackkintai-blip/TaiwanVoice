import 'fake-indexeddb/auto';
import { serializeBackup, mergeCards, exportBackup, importBackup } from '../../src/data/backup';
import { putCard, listCards, openDb } from '../../src/data/db';
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
});

test('serializeBackup produces parseable JSON with a version field', () => {
  const json = serializeBackup([makeCard()]);
  const parsed = JSON.parse(json);
  expect(parsed.version).toBe(1);
  expect(parsed.cards).toHaveLength(1);
});

test('mergeCards keeps the newer updatedAt when the same id appears in both', () => {
  const older = makeCard({ updatedAt: '2026-08-19T00:00:00.000Z', meaning: 'old' });
  const newer = makeCard({ updatedAt: '2026-08-20T00:00:00.000Z', meaning: 'new' });
  expect(mergeCards([older], [newer])[0].meaning).toBe('new');
  expect(mergeCards([newer], [older])[0].meaning).toBe('new');
});

test('mergeCards keeps ids present in only one side', () => {
  const a = makeCard({ id: 'a' });
  const b = makeCard({ id: 'b' });
  const merged = mergeCards([a], [b]);
  expect(merged.map((c) => c.id).sort()).toEqual(['a', 'b']);
});

test('exportBackup then importBackup round-trips through the real db', async () => {
  await putCard(makeCard({ id: 'existing' }));
  const json = await exportBackup();
  const merged = await importBackup(json);
  expect(merged.some((c) => c.id === 'existing')).toBe(true);
  expect((await listCards()).some((c) => c.id === 'existing')).toBe(true);
});

test('importBackup merges with cards already in the db rather than replacing them', async () => {
  await putCard(makeCard({ id: 'kept-local', updatedAt: '2026-08-20T00:00:00.000Z' }));
  const incomingJson = serializeBackup([makeCard({ id: 'from-backup' })]);
  const merged = await importBackup(incomingJson);
  expect(merged.map((c) => c.id).sort()).toEqual(['from-backup', 'kept-local']);
});
