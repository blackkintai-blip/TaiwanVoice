import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseMoedict, parseUnihanKMandarin, mergeDicts } from './build-dict-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const rawDir = join(here, 'raw');
const outDir = join(here, '..', 'public', 'dict');
const outFile = join(outDir, 'zhuyin-dict.json');

const moedictRaw = JSON.parse(readFileSync(join(rawDir, 'moedict-dict-concised.audio.json'), 'utf-8'));
const unihanText = readFileSync(join(rawDir, 'unihan-kmandarin.txt'), 'utf-8');

const moedict = parseMoedict(moedictRaw);
const unihan = parseUnihanKMandarin(unihanText);
const merged = mergeDicts(moedict, unihan);

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(merged), 'utf-8');

console.log(`wrote ${Object.keys(merged).length} entries to ${outFile}`);
console.log(`  moedict: ${moedict.size}, unihan-only additions: ${Object.keys(merged).length - moedict.size}`);
