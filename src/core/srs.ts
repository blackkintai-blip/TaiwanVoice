import type { SrsState } from './types';

export type Grade = 'again' | 'good' | 'easy';

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const MAX_INTERVAL = 365;

export function newSrsState(today: string): SrsState {
  return { due: today, interval: 0, ease: 2.5, reps: 0, lapses: 0 };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function clampEase(ease: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, ease));
}

export function grade(state: SrsState, g: Grade, today: string): SrsState {
  if (g === 'again') {
    return {
      due: today,
      interval: 0,
      ease: clampEase(state.ease - 0.2),
      reps: 0,
      lapses: state.lapses + 1,
    };
  }

  const nextEase = g === 'easy' ? clampEase(state.ease + 0.15) : state.ease;
  let interval: number;
  if (state.interval === 0) {
    interval = g === 'easy' ? 3 : 1;
  } else {
    const factor = g === 'easy' ? state.ease * 1.3 : state.ease;
    interval = Math.round(state.interval * factor);
  }
  interval = Math.min(MAX_INTERVAL, interval);

  return {
    due: addDays(today, interval),
    interval,
    ease: nextEase,
    reps: state.reps + 1,
    lapses: state.lapses,
  };
}
