const TONE_MAP = {
  a: ['a', 0], ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  o: ['o', 0], ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  e: ['e', 0], ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  i: ['i', 0], ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  u: ['u', 0], ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ü: ['v', 0], ǖ: ['v', 1], ǘ: ['v', 2], ǚ: ['v', 3], ǜ: ['v', 4],
  ê: ['ê', 0],
};

const TONE_SUFFIX = { 1: '', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ' };

const INITIALS = [
  ['zh', 'ㄓ'], ['ch', 'ㄔ'], ['sh', 'ㄕ'],
  ['b', 'ㄅ'], ['p', 'ㄆ'], ['m', 'ㄇ'], ['f', 'ㄈ'],
  ['d', 'ㄉ'], ['t', 'ㄊ'], ['n', 'ㄋ'], ['l', 'ㄌ'],
  ['g', 'ㄍ'], ['k', 'ㄎ'], ['h', 'ㄏ'],
  ['j', 'ㄐ'], ['q', 'ㄑ'], ['x', 'ㄒ'],
  ['r', 'ㄖ'],
  ['z', 'ㄗ'], ['c', 'ㄘ'], ['s', 'ㄙ'],
];

const BUZZ_INITIALS = new Set(['z', 'c', 's', 'zh', 'ch', 'sh', 'r']);
const YU_INITIALS = new Set(['j', 'q', 'x']);

const YW_NORMALIZE = {
  yi: 'i', ya: 'ia', ye: 'ie', yao: 'iao', you: 'iu', yan: 'ian', yin: 'in',
  yang: 'iang', ying: 'ing', yong: 'iong',
  yu: 'v', yue: 've', yuan: 'van', yun: 'vn',
  wu: 'u', wa: 'ua', wo: 'uo', wai: 'uai', wei: 'ui', wan: 'uan',
  wen: 'un', wang: 'uang', weng: 'ueng',
};

const FINALS = {
  i: 'ㄧ', u: 'ㄨ', v: 'ㄩ',
  a: 'ㄚ', o: 'ㄛ', e: 'ㄜ', ê: 'ㄝ',
  ai: 'ㄞ', ei: 'ㄟ', ao: 'ㄠ', ou: 'ㄡ',
  an: 'ㄢ', en: 'ㄣ', ang: 'ㄤ', eng: 'ㄥ', er: 'ㄦ',
  ia: 'ㄧㄚ', ie: 'ㄧㄝ', iao: 'ㄧㄠ', iu: 'ㄧㄡ',
  ian: 'ㄧㄢ', in: 'ㄧㄣ', iang: 'ㄧㄤ', ing: 'ㄧㄥ', iong: 'ㄩㄥ',
  ua: 'ㄨㄚ', uo: 'ㄨㄛ', uai: 'ㄨㄞ', ui: 'ㄨㄟ',
  uan: 'ㄨㄢ', un: 'ㄨㄣ', uang: 'ㄨㄤ', ueng: 'ㄨㄥ', ong: 'ㄨㄥ',
  ve: 'ㄩㄝ', van: 'ㄩㄢ', vn: 'ㄩㄣ',
};

function stripTone(syllable) {
  let plain = '';
  let tone = 0;
  for (const ch of syllable) {
    const entry = TONE_MAP[ch];
    if (entry) {
      plain += entry[0];
      if (entry[1]) tone = entry[1];
    } else if (/[a-zêv]/i.test(ch)) {
      plain += ch.toLowerCase();
    } else {
      return null;
    }
  }
  return { plain, tone };
}

export function syllableToZhuyin(syllable) {
  const stripped = stripTone(syllable);
  if (!stripped) return null;
  const { plain, tone } = stripped;

  let initialKey = '';
  let finalKey;

  if (YW_NORMALIZE[plain]) {
    finalKey = YW_NORMALIZE[plain];
  } else {
    const match = INITIALS.find(([p]) => plain.startsWith(p));
    if (match) {
      initialKey = match[0];
      finalKey = plain.slice(initialKey.length);
      if (YU_INITIALS.has(initialKey) && finalKey.startsWith('u')) {
        finalKey = 'v' + finalKey.slice(1);
      }
    } else {
      finalKey = plain;
    }
  }

  const initialSymbol = initialKey ? INITIALS.find(([p]) => p === initialKey)[1] : '';
  let finalSymbol;
  if (BUZZ_INITIALS.has(initialKey) && finalKey === 'i') {
    finalSymbol = '';
  } else {
    finalSymbol = FINALS[finalKey];
    if (finalSymbol === undefined) return null;
  }

  const toneMark = tone === 0 ? '' : TONE_SUFFIX[tone];
  const neutralPrefix = tone === 0 ? '˙' : '';
  return `${neutralPrefix}${initialSymbol}${finalSymbol}${toneMark}`;
}

export function kMandarinToTaiwanZhuyin(field) {
  const values = field.trim().split(/\s+/);
  const taiwanSyllable = values.length >= 2 ? values[1] : values[0];
  return syllableToZhuyin(taiwanSyllable);
}
