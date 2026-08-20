import { useEffect, useState } from 'react';
import { exportBackup, importBackup } from '../../data/backup';
import { listCards, putCards } from '../../data/db';
import { annotate } from '../../core/bopomofo';
import { pickTaiwaneseVoice } from '../../audio/speech';
import { useDict } from '../../dict/useDict';
import { loadPlaybackSettings, savePlaybackSettings, type PlaybackSettings } from '../../data/settings';

export function SettingsScreen() {
  const { dict } = useDict();
  const [hasVoice, setHasVoice] = useState(true);
  const [status, setStatus] = useState('');
  const [playback, setPlayback] = useState<PlaybackSettings>(() => loadPlaybackSettings());

  useEffect(() => {
    function check() {
      setHasVoice(pickTaiwaneseVoice(window.speechSynthesis.getVoices()) !== null);
    }
    check();
    window.speechSynthesis.addEventListener?.('voiceschanged', check);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', check);
  }, []);

  function updatePlayback(patch: Partial<PlaybackSettings>) {
    setPlayback((p) => {
      const next = { ...p, ...patch };
      savePlaybackSettings(next);
      return next;
    });
  }

  async function handleExport() {
    const json = await exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ty-bopomo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importBackup(text);
    setStatus('読み込みました');
    e.target.value = '';
  }

  async function reapplyDict() {
    if (!dict) return;
    const cards = await listCards();
    const updated = cards
      .filter((c) => !c.zhuyinEdited)
      .map((c) => ({ ...c, zhuyin: annotate(c.hanzi, dict), updatedAt: new Date().toISOString() }));
    await putCards(updated);
    setStatus(`${updated.length} 件を更新しました`);
  }

  return (
    <div className="settings-screen">
      <h2>設定</h2>

      {!hasVoice && (
        <p className="settings-screen__warning">
          台湾華語の音声が見つかりません。iPhoneは「設定 &gt; アクセシビリティ &gt; 読み上げコンテンツ &gt; 声」で中国語（台湾）を、
          Androidは「設定 &gt; 音声合成エンジン」で言語データの中国語（台湾）をダウンロードしてください。
        </p>
      )}

      <section>
        <button onClick={handleExport}>バックアップを書き出す</button>
        <label>
          バックアップを読み込む
          <input type="file" accept="application/json" onChange={handleImport} />
        </label>
      </section>

      <section>
        <button onClick={reapplyDict}>辞書を再適用</button>
      </section>

      <section>
        <label>
          繰り返し回数
          <input
            type="number" min={1} max={5} value={playback.repeatCount}
            onChange={(e) => updatePlayback({ repeatCount: Number(e.target.value) })}
          />
        </label>
        <label>
          間の長さ（秒）
          <input
            type="number" min={0} max={10} step={0.5} value={playback.gapMs / 1000}
            onChange={(e) => updatePlayback({ gapMs: Number(e.target.value) * 1000 })}
          />
        </label>
        <label>
          読み上げ速度
          <input
            type="number" min={0.5} max={2} step={0.1} value={playback.rate}
            onChange={(e) => updatePlayback({ rate: Number(e.target.value) })}
          />
        </label>
      </section>

      {status && <p>{status}</p>}
    </div>
  );
}
