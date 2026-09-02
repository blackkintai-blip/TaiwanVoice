import { loadListenSettings, loadPlaybackSettings, saveListenSettings, savePlaybackSettings } from '../../src/data/settings';

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

test('listen settings return defaults when nothing is saved', () => {
  expect(loadListenSettings()).toEqual({ order: 'sequential', scope: 'both', continuous: false, loop: false });
});

test('listen settings save then load round-trips', () => {
  saveListenSettings({ order: 'random', scope: 'wordOnly', continuous: true, loop: true });
  expect(loadListenSettings()).toEqual({ order: 'random', scope: 'wordOnly', continuous: true, loop: true });
});

test('listen settings fall back to defaults on corrupt stored data', () => {
  localStorage.setItem('ty-bopomo:listen-settings', 'not json');
  expect(loadListenSettings()).toEqual({ order: 'sequential', scope: 'both', continuous: false, loop: false });
});
