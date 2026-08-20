const MAX_WORD_LEN = 8;

export function annotate(text: string, dict: Record<string, string>): string {
  let result = '';
  const chars = Array.from(text);
  let i = 0;
  while (i < chars.length) {
    let matched = false;
    const maxLen = Math.min(MAX_WORD_LEN, chars.length - i);
    for (let len = maxLen; len >= 1; len--) {
      const candidate = chars.slice(i, i + len).join('');
      if (dict[candidate] !== undefined) {
        result += dict[candidate];
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      i += 1; // unresolved character contributes nothing
    }
  }
  return result;
}
