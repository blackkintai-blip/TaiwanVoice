# Raw dictionary sources

## moedict-dict-concised.audio.json

Source: https://github.com/g0v/moedict-data (`dict-concised.audio.json`, `main` branch)
Content: 教育部《國語辭典簡編本》word list, keyed as `"漢字.ㄅㄆㄇㄈ": <audio id>`.
License: 創用CC-姓名標示-禁止改作 台灣3.0版 (CC BY-ND 3.0 TW), per the repo's own README:
"依教育部之解釋...改作限制標的為文字資料本身，不限制格式轉換及後續應用"
(format conversion is explicitly permitted; only altering the text content itself is restricted).
We only extract the hanzi/zhuyin pairs from the keys (format conversion) — the audio ids are unused.

## unihan-kmandarin.txt

Source: https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip (`Unihan_Readings.txt`),
filtered to `kMandarin` lines only.
License: Unicode, Inc. License Agreement (UCD/Unihan data license) — permits use and redistribution.
Field semantics (Unicode TR38): "When there are two values, then the first is preferred for
zh-Hans (CN) and the second is preferred for zh-Hant (TW). When there is only one value, it is
appropriate for both." Used only as a per-character fallback for characters absent from the
moedict word list; the CN/TW split rule above is applied so no mainland-only reading is ever used
for a character that has a distinct Taiwan reading.
