import { exportBackup, importBackup } from '../data/backup';
import { onDbChange } from '../data/db';
import { connect as gisConnect, disconnectLocal, getAccessToken, downloadBackup, uploadBackup } from './googleDrive';

const CONNECTED_KEY = 'ty-bopomo-gdrive-connected';

export type SyncStatus = { state: 'idle' | 'syncing' | 'error'; message: string };

let status: SyncStatus = { state: 'idle', message: '' };
const listeners = new Set<(s: SyncStatus) => void>();

function setStatus(next: SyncStatus): void {
  status = next;
  listeners.forEach((fn) => fn(status));
}

export function subscribeSyncStatus(fn: (s: SyncStatus) => void): () => void {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

export function isConnected(): boolean {
  return localStorage.getItem(CONNECTED_KEY) === '1';
}

export async function connectDrive(): Promise<void> {
  await gisConnect();
  localStorage.setItem(CONNECTED_KEY, '1');
  await syncDown();
  await syncUp();
}

export function disconnectDrive(): void {
  disconnectLocal();
  localStorage.removeItem(CONNECTED_KEY);
  setStatus({ state: 'idle', message: '' });
}

export async function syncUp(): Promise<void> {
  if (!isConnected()) return;
  const token = await getAccessToken();
  if (!token) return;
  setStatus({ state: 'syncing', message: '同期中…' });
  try {
    const json = await exportBackup();
    await uploadBackup(token, json);
    setStatus({ state: 'idle', message: `同期しました（${new Date().toLocaleTimeString('ja-JP')}）` });
  } catch {
    setStatus({ state: 'error', message: '同期に失敗しました' });
  }
}

export async function syncDown(): Promise<void> {
  if (!isConnected()) return;
  const token = await getAccessToken();
  if (!token) return;
  setStatus({ state: 'syncing', message: '同期中…' });
  try {
    const json = await downloadBackup(token);
    if (json) await importBackup(json);
    setStatus({ state: 'idle', message: `同期しました（${new Date().toLocaleTimeString('ja-JP')}）` });
  } catch {
    setStatus({ state: 'error', message: '同期に失敗しました' });
  }
}

let uploadTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleUpload(): void {
  if (!isConnected()) return;
  if (uploadTimer) clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => {
    void syncUp();
  }, 1500);
}

let initialized = false;

export function initSync(): void {
  if (initialized) return;
  initialized = true;
  onDbChange(scheduleUpload);
  if (isConnected()) void syncDown();
}
