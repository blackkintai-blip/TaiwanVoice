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
