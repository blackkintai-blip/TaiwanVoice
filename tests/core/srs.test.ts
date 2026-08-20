import { newSrsState, grade } from '../../src/core/srs';

test('new card starts due today with interval 0 and ease 2.5', () => {
  const s = newSrsState('2026-08-20');
  expect(s).toEqual({ due: '2026-08-20', interval: 0, ease: 2.5, reps: 0, lapses: 0 });
});

test('good on a new card sets interval to 1 day and reps to 1', () => {
  const s = newSrsState('2026-08-20');
  const next = grade(s, 'good', '2026-08-20');
  expect(next.interval).toBe(1);
  expect(next.due).toBe('2026-08-21');
  expect(next.reps).toBe(1);
  expect(next.ease).toBe(2.5);
});

test('easy on a new card sets interval to 3 days and bumps ease', () => {
  const s = newSrsState('2026-08-20');
  const next = grade(s, 'easy', '2026-08-20');
  expect(next.interval).toBe(3);
  expect(next.due).toBe('2026-08-23');
  expect(next.ease).toBeCloseTo(2.65);
});

test('good on a reviewed card multiplies interval by ease and rounds', () => {
  const s = { due: '2026-08-20', interval: 4, ease: 2.5, reps: 1, lapses: 0 };
  const next = grade(s, 'good', '2026-08-20');
  expect(next.interval).toBe(10); // round(4 * 2.5)
  expect(next.due).toBe('2026-08-30');
  expect(next.reps).toBe(2);
});

test('easy on a reviewed card multiplies by ease * 1.3 and bumps ease', () => {
  const s = { due: '2026-08-20', interval: 4, ease: 2.5, reps: 1, lapses: 0 };
  const next = grade(s, 'easy', '2026-08-20');
  expect(next.interval).toBe(13); // round(4 * 2.5 * 1.3) = round(13)
  expect(next.ease).toBeCloseTo(2.65);
});

test('again resets interval to 0, drops ease by 0.20, bumps lapses, resets reps', () => {
  const s = { due: '2026-08-20', interval: 10, ease: 2.5, reps: 3, lapses: 0 };
  const next = grade(s, 'again', '2026-08-20');
  expect(next.interval).toBe(0);
  expect(next.due).toBe('2026-08-20');
  expect(next.ease).toBeCloseTo(2.3);
  expect(next.reps).toBe(0);
  expect(next.lapses).toBe(1);
});

test('ease never drops below 1.3', () => {
  const s = { due: '2026-08-20', interval: 1, ease: 1.35, reps: 1, lapses: 5 };
  const next = grade(s, 'again', '2026-08-20');
  expect(next.ease).toBeCloseTo(1.3);
});

test('ease never rises above 3.0', () => {
  const s = { due: '2026-08-20', interval: 1, ease: 2.95, reps: 1, lapses: 0 };
  const next = grade(s, 'easy', '2026-08-20');
  expect(next.ease).toBeCloseTo(3.0);
});

test('interval never exceeds 365 days', () => {
  const s = { due: '2026-08-20', interval: 300, ease: 3.0, reps: 5, lapses: 0 };
  const next = grade(s, 'easy', '2026-08-20');
  expect(next.interval).toBe(365);
});
