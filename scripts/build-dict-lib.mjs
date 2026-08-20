import { kMandarinToTaiwanZhuyin } from './pinyin-to-bopomofo.mjs';

export function parseMoedict(raw) {
  const dict = new Map();
  for (const key of Object.keys(raw)) {
    const dot = key.lastIndexOf('.');
    if (dot === -1) continue;
    const hanzi = key.slice(0, dot);
    const zhuyin = key.slice(dot + 1);
    if (!dict.has(hanzi)) dict.set(hanzi, zhuyin);
  }
  return dict;
}

function codePointToChar(codePointHex) {
  return String.fromCodePoint(parseInt(codePointHex.replace('U+', ''), 16));
}

export function parseUnihanKMandarin(text) {
  const dict = new Map();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [codePoint, field, value] = trimmed.split('\t');
    if (field !== 'kMandarin') continue;
    const zhuyin = kMandarinToTaiwanZhuyin(value);
    if (zhuyin) dict.set(codePointToChar(codePoint), zhuyin);
  }
  return dict;
}

export function mergeDicts(moedict, unihan) {
  const merged = {};
  for (const [hanzi, zhuyin] of unihan) merged[hanzi] = zhuyin;
  for (const [hanzi, zhuyin] of moedict) merged[hanzi] = zhuyin;
  return merged;
}
