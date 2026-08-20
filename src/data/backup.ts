import type { Card } from '../core/types';
import { listCards, putCards } from './db';

const BACKUP_VERSION = 1;

export function serializeBackup(cards: Card[]): string {
  return JSON.stringify({ version: BACKUP_VERSION, cards }, null, 2);
}

export function mergeCards(existing: Card[], incoming: Card[]): Card[] {
  const byId = new Map<string, Card>();
  for (const card of existing) byId.set(card.id, card);
  for (const card of incoming) {
    const current = byId.get(card.id);
    if (!current || card.updatedAt > current.updatedAt) {
      byId.set(card.id, card);
    }
  }
  return [...byId.values()];
}

export async function exportBackup(): Promise<string> {
  const cards = await listCards();
  return serializeBackup(cards);
}

export async function importBackup(json: string): Promise<Card[]> {
  const parsed = JSON.parse(json) as { version: number; cards: Card[] };
  const existing = await listCards();
  const merged = mergeCards(existing, parsed.cards);
  await putCards(merged);
  return merged;
}
