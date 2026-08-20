import { loadPlaybackSettings, savePlaybackSettings } from '../../src/data/settings';

beforeEach(() => localStorage.clear());

test('returns defaults when nothing is saved', () => {
  expect(loadPlaybackSettings()).toEqual({ repeatCount: 1, gapMs: 1500, rate: 1.0 });
});

test('save then load round-trips', () => {
  savePlaybackSettings({ repeatCount: 2, gapMs: 2000, rate: 0.8 });
  expect(loadPlaybackSettings()).toEqual({ repeatCount: 2, gapMs: 2000, rate: 0.8 });
});

test('falls back to defaults on corrupt stored data', () => {
  localStorage.setItem('ty-bopomo:playback-settings', 'not json');
  expect(loadPlaybackSettings()).toEqual({ repeatCount: 1, gapMs: 1500, rate: 1.0 });
});
