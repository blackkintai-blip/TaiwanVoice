const CLIENT_ID = '979321321791-j3vihu72sb01hhoihh888qeqrh7rtmrb.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'ty-bopomo-backup.json';
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

type TokenResponse = { access_token?: string; error?: string };
type TokenClient = { requestAccessToken: (opts?: { prompt?: string }) => void };

interface GoogleAccountsOAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (resp: TokenResponse) => void;
    error_callback?: (err: { type: string }) => void;
  }): TokenClient;
  revoke(token: string, done?: () => void): void;
}

declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleAccountsOAuth2 } };
  }
}

let gisLoaded: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (!gisLoaded) {
    gisLoaded = new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }
  return gisLoaded;
}

let tokenClient: TokenClient | null = null;
let cachedToken: { value: string; expiresAt: number } | null = null;
let pendingResolve: ((token: string) => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;

async function getTokenClient(): Promise<TokenClient> {
  await loadGis();
  if (!tokenClient) {
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp) => {
        const resolve = pendingResolve;
        const reject = pendingReject;
        pendingResolve = null;
        pendingReject = null;
        if (resp.error || !resp.access_token) {
          reject?.(new Error(resp.error ?? 'no access token'));
          return;
        }
        cachedToken = { value: resp.access_token, expiresAt: Date.now() + 55 * 60 * 1000 };
        resolve?.(resp.access_token);
      },
      error_callback: (err) => {
        const reject = pendingReject;
        pendingResolve = null;
        pendingReject = null;
        reject?.(new Error(err.type));
      },
    });
  }
  return tokenClient;
}

function requestToken(prompt: string): Promise<string> {
  return getTokenClient().then(
    (client) =>
      new Promise<string>((resolve, reject) => {
        pendingResolve = resolve;
        pendingReject = reject;
        client.requestAccessToken({ prompt });
      }),
  );
}

export async function connect(): Promise<void> {
  await requestToken('consent');
}

export async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  try {
    return await requestToken('');
  } catch {
    return null;
  }
}

export function disconnectLocal(): void {
  if (cachedToken) {
    window.google?.accounts.oauth2.revoke(cachedToken.value);
  }
  cachedToken = null;
}

async function findFileId(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}'`);
  const res = await fetch(`${DRIVE_FILES}?spaces=appDataFolder&q=${q}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const data = (await res.json()) as { files: { id: string }[] };
  return data.files[0]?.id ?? null;
}

export async function uploadBackup(token: string, json: string): Promise<void> {
  const fileId = await findFileId(token);
  if (fileId) {
    const res = await fetch(`${DRIVE_UPLOAD}/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: json,
    });
    if (!res.ok) throw new Error(`Drive update failed: ${res.status}`);
    return;
  }
  const boundary = 'ty_bopomo_boundary';
  const metadata = JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] });
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${json}\r\n` +
    `--${boundary}--`;
  const res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error(`Drive create failed: ${res.status}`);
}

export async function downloadBackup(token: string): Promise<string | null> {
  const fileId = await findFileId(token);
  if (!fileId) return null;
  const res = await fetch(`${DRIVE_FILES}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
  return res.text();
}
