import { parseMoedict, parseUnihanKMandarin, mergeDicts } from '../../scripts/build-dict-lib.mjs';

test('parseMoedict extracts hanzi -> zhuyin from "word.zhuyin" keys', () => {
  const raw = { '垃圾.ㄌㄜˋㄙㄜˋ': '0001', '銀行.ㄧㄣˊㄏㄤˊ': '0002' };
  const dict = parseMoedict(raw);
  expect(dict.get('垃圾')).toBe('ㄌㄜˋㄙㄜˋ');
  expect(dict.get('銀行')).toBe('ㄧㄣˊㄏㄤˊ');
});

test('parseMoedict keeps the first reading when a character is polyphonic', () => {
  const raw = { '和.ㄏㄜˊ': '1', '和.ㄏㄢˋ': '2' };
  const dict = parseMoedict(raw);
  expect(dict.get('和')).toBe('ㄏㄜˊ');
});

test('parseUnihanKMandarin reads U+XXXX kMandarin lines and applies the TW split', () => {
  const text = [
    'U+548C\tkMandarin\thé',
    'U+4E7E\tkMandarin\tqián gān',
    'U+3400\tkDefinition\t(some other field, ignored)',
  ].join('\n');
  const dict = parseUnihanKMandarin(text);
  expect(dict.get('和')).toBe('ㄏㄜˊ');
  expect(dict.get('乾')).toBe('ㄍㄢ');
  expect(dict.has('㐀')).toBe(false);
});

test('mergeDicts prefers moedict over unihan for the same character', () => {
  const moedict = new Map([['和', 'ㄏㄢˋ']]);
  const unihan = new Map([['和', 'ㄏㄜˊ'], ['乾', 'ㄍㄢ']]);
  const merged = mergeDicts(moedict, unihan);
  expect(merged['和']).toBe('ㄏㄢˋ');
  expect(merged['乾']).toBe('ㄍㄢ');
});
