export type PlaybackSettings = { repeatCount: number; gapMs: number; rate: number };

const KEY = 'ty-bopomo:playback-settings';
const DEFAULTS: PlaybackSettings = { repeatCount: 1, gapMs: 1500, rate: 1.0 };

export function loadPlaybackSettings(storage: Storage = window.localStorage): PlaybackSettings {
  const raw = storage.getItem(KEY);
  if (!raw) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function savePlaybackSettings(settings: PlaybackSettings, storage: Storage = window.localStorage): void {
  storage.setItem(KEY, JSON.stringify(settings));
}

export type ListenSettings = { order: 'sequential' | 'random'; scope: 'both' | 'wordOnly' | 'exampleOnly'; continuous: boolean };

const LISTEN_KEY = 'ty-bopomo:listen-settings';
const LISTEN_DEFAULTS: ListenSettings = { order: 'sequential', scope: 'both', continuous: false };

export function loadListenSettings(storage: Storage = window.localStorage): ListenSettings {
  const raw = storage.getItem(LISTEN_KEY);
  if (!raw) return LISTEN_DEFAULTS;
  try {
    return { ...LISTEN_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return LISTEN_DEFAULTS;
  }
}

export function saveListenSettings(settings: ListenSettings, storage: Storage = window.localStorage): void {
  storage.setItem(LISTEN_KEY, JSON.stringify(settings));
}
