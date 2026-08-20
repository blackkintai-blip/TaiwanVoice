import { annotate } from '../../src/core/bopomofo';

const dict = {
  '銀行': 'ㄧㄣˊㄏㄤˊ',
  '銀': 'ㄧㄣˊ',
  '行': 'ㄒㄧㄥˊ',
  '走': 'ㄗㄡˇ',
  '垃圾': 'ㄌㄜˋㄙㄜˋ',
};

test('exact single-word match', () => {
  expect(annotate('垃圾', dict)).toBe('ㄌㄜˋㄙㄜˋ');
});

test('prefers the longest match over single characters', () => {
  expect(annotate('銀行', dict)).toBe('ㄧㄣˊㄏㄤˊ');
});

test('falls back to single characters when no multi-char match exists', () => {
  expect(annotate('行走', dict)).toBe('ㄒㄧㄥˊㄗㄡˇ');
});

test('mixes known and unknown characters, unknown contributes nothing', () => {
  expect(annotate('銀X行', dict)).toBe('ㄧㄣˊㄒㄧㄥˊ');
});

test('empty string returns empty string', () => {
  expect(annotate('', dict)).toBe('');
});
