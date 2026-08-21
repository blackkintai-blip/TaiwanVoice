import { openDB, type IDBPDatabase } from 'idb';
import type { Card } from '../core/types';

const DB_NAME = 'ty-bopomo';
const DB_VERSION = 1;
const STORE = 'cards';

let dbPromise: Promise<IDBPDatabase> | null = null;

const changeListeners = new Set<() => void>();

export function onDbChange(fn: () => void): () => void {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

function notifyChange(): void {
  changeListeners.forEach((fn) => fn());
}

export function openDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function listCards(): Promise<Card[]> {
  const db = await openDb();
  return db.getAll(STORE);
}

export async function getCard(id: string): Promise<Card | undefined> {
  const db = await openDb();
  return db.get(STORE, id);
}

export async function putCard(card: Card): Promise<void> {
  const db = await openDb();
  await db.put(STORE, card);
  notifyChange();
}

export async function putCards(cards: Card[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  await Promise.all([...cards.map((c) => tx.store.put(c)), tx.done]);
  notifyChange();
}

export async function deleteCard(id: string): Promise<void> {
  const db = await openDb();
  await db.delete(STORE, id);
  notifyChange();
}

export async function listTags(): Promise<string[]> {
  const cards = await listCards();
  const tags = new Set<string>();
  for (const card of cards) {
    for (const tag of card.tags) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b, 'ja'));
}
