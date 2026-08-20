import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '../../core/types';
import { listCards } from '../../data/db';
import { pickTaiwaneseVoice, playRepeated } from '../../audio/speech';
import { loadPlaybackSettings } from '../../data/settings';

type Order = 'sequential' | 'random';

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function ListenScreen() {
  const [cards, setCards] = useState<Card[]>([]);
  const [order, setOrder] = useState<Order>('sequential');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [continuous, setContinuous] = useState(false);
  const sessionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    listCards().then(setCards);
  }, []);

  const ordered = useMemo(
    () => (order === 'random' ? shuffled(cards) : cards),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, order],
  );

  const current = ordered[index];

  function stopPlayback() {
    sessionRef.current?.stop();
    sessionRef.current = null;
  }

  useEffect(() => stopPlayback, []);

  function play() {
    if (!current) return;
    stopPlayback();
    const settings = loadPlaybackSettings();
    const voice = pickTaiwaneseVoice(window.speechSynthesis.getVoices());
    const items = [current.hanzi, ...current.examples.map((e) => e.hanzi)];
    sessionRef.current = playRepeated(window.speechSynthesis, voice, items, {
      rate: settings.rate,
      repeatCount: settings.repeatCount,
      gapMs: settings.gapMs,
      onAllDone: () => {
        if (continuous) setIndex((i) => Math.min(ordered.length - 1, i + 1));
      },
    });
  }

  // In continuous mode, advancing the index (whether from onAllDone above or
  // from tapping next/prev) should start the next card playing on its own;
  // reacting to the index change here (rather than recursing through
  // onAllDone directly) keeps `play` reading the current render's `current`
  // instead of a stale closure captured when the previous card started.
  useEffect(() => {
    if (continuous) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, continuous]);

  function next() {
    stopPlayback();
    setIndex((i) => Math.min(ordered.length - 1, i + 1));
  }

  function prev() {
    stopPlayback();
    setIndex((i) => Math.max(0, i - 1));
  }

  if (ordered.length === 0) {
    return <div className="listen-screen listen-screen--empty">カードがありません</div>;
  }

  return (
    <div className="listen-screen">
      <div className="listen-screen__header">
        {index + 1} / {ordered.length}
        <select value={order} onChange={(e) => setOrder(e.target.value as Order)}>
          <option value="sequential">登録順</option>
          <option value="random">ランダム</option>
        </select>
        <label>
          <input type="checkbox" checked={continuous} onChange={(e) => setContinuous(e.target.checked)} />
          自動連続再生
        </label>
      </div>

      <button className="listen-screen__play" onClick={play} aria-label="再生">
        ●
      </button>

      {revealed && current && (
        <div className="listen-screen__reveal">
          <div>{current.hanzi}</div>
          <div>{current.zhuyin}</div>
          <div>{current.meaning}</div>
        </div>
      )}

      <div className="listen-screen__controls">
        <button onClick={prev} aria-label="前">◀</button>
        <button onClick={play} aria-label="もう一度">⟳</button>
        <button
          aria-label="文字を見る"
          onPointerDown={() => setRevealed(true)}
          onPointerUp={() => setRevealed(false)}
          onPointerLeave={() => setRevealed(false)}
        >
          👁
        </button>
        <button onClick={next} aria-label="次">▶</button>
      </div>
    </div>
  );
}
