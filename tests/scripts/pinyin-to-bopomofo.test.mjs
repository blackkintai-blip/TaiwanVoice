import { syllableToZhuyin, kMandarinToTaiwanZhuyin } from '../../scripts/pinyin-to-bopomofo.mjs';

test('plain syllable with tone 2', () => {
  expect(syllableToZhuyin('hé')).toBe('ㄏㄜˊ');
});

test('tone 4', () => {
  expect(syllableToZhuyin('rì')).toBe('ㄖˋ');
});

test('neutral tone has no diacritic and gets a leading dot', () => {
  expect(syllableToZhuyin('de')).toBe('˙ㄉㄜ');
});

test('zh/ch/sh/r/z/c/s + i has no vowel glyph', () => {
  expect(syllableToZhuyin('zhī')).toBe('ㄓ');
  expect(syllableToZhuyin('sī')).toBe('ㄙ');
  expect(syllableToZhuyin('rì')).toBe('ㄖˋ');
});

test('l/n + i keeps the vowel glyph', () => {
  expect(syllableToZhuyin('lǐ')).toBe('ㄌㄧˇ');
});

test('j/q/x + u means ü (dots dropped in pinyin spelling)', () => {
  expect(syllableToZhuyin('xué')).toBe('ㄒㄩㄝˊ');
  expect(syllableToZhuyin('qián')).not.toBe(null);
});

test('n/l + literal ü keeps its explicit umlaut', () => {
  expect(syllableToZhuyin('lüè')).toBe('ㄌㄩㄝˋ');
});

test('null-initial y-forms', () => {
  expect(syllableToZhuyin('yòng')).toBe('ㄩㄥˋ');
  expect(syllableToZhuyin('yī')).toBe('ㄧ');
});

test('null-initial w-forms', () => {
  expect(syllableToZhuyin('wǒ')).toBe('ㄨㄛˇ');
});

test('real "ong" is distinct from null-initial "yong"', () => {
  expect(syllableToZhuyin('hóng')).toBe('ㄏㄨㄥˊ');
  expect(syllableToZhuyin('yòng')).toBe('ㄩㄥˋ');
});

test('single value kMandarin field applies to both CN and TW', () => {
  expect(kMandarinToTaiwanZhuyin('hé')).toBe('ㄏㄜˊ');
});

test('two-value kMandarin field: second value is Taiwan', () => {
  expect(kMandarinToTaiwanZhuyin('qián gān')).toBe('ㄍㄢ');
});

test('unparseable syllable returns null instead of guessing', () => {
  expect(syllableToZhuyin('xyz')).toBe(null);
});
