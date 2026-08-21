import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '../../core/types';
import { listCards } from '../../data/db';
import { pickTaiwaneseVoice, playRepeated } from '../../audio/speech';
import { loadPlaybackSettings } from '../../data/settings';
import { EyeIcon, NextIcon, PlayIcon, PrevIcon, ReplayIcon } from '../icons';

type Order = 'sequential' | 'random';
type Scope = 'both' | 'wordOnly' | 'exampleOnly';

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
  const [scope, setScope] = useState<Scope>('both');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [continuous, setContinuous] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(0);
  const sessionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    listCards().then(setCards);
  }, []);

  const scoped = useMemo(
    () => (scope === 'exampleOnly' ? cards.filter((c) => c.examples.length > 0) : cards),
    [cards, scope],
  );

  const ordered = useMemo(
    () => (order === 'random' ? shuffled(scoped) : scoped),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scoped, order],
  );

  const current = ordered[index];

  function stopPlayback() {
    sessionRef.current?.stop();
    sessionRef.current = null;
  }

  useEffect(() => stopPlayback, []);

  useEffect(() => {
    stopPlayback();
    setPlayingIndex(0);
    setIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, order]);

  function play() {
    if (!current) return;
    stopPlayback();
    setPlayingIndex(0);
    const settings = loadPlaybackSettings();
    const voice = pickTaiwaneseVoice(window.speechSynthesis.getVoices());
    const items =
      scope === 'wordOnly'
        ? [current.hanzi]
        : scope === 'exampleOnly'
          ? current.examples.map((e) => e.hanzi)
          : [current.hanzi, ...current.examples.map((e) => e.hanzi)];
    sessionRef.current = playRepeated(window.speechSynthesis, voice, items, {
      rate: settings.rate,
      repeatCount: settings.repeatCount,
      gapMs: settings.gapMs,
      onItemStart: setPlayingIndex,
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
    setPlayingIndex(0);
    setIndex((i) => Math.min(ordered.length - 1, i + 1));
  }

  function prev() {
    stopPlayback();
    setPlayingIndex(0);
    setIndex((i) => Math.max(0, i - 1));
  }

  if (ordered.length === 0) {
    const message = scope === 'exampleOnly' && cards.length > 0 ? '例文のあるカードがありません' : 'カードがありません';
    return <div className="listen-screen listen-screen--empty">{message}</div>;
  }

  return (
    <div className="listen-screen">
      <div className="listen-screen__header">
        <span>
          {index + 1} / {ordered.length}
        </span>
        <div className="listen-screen__header-actions">
          <button
            className={order === 'random' ? 'pill pill--toggled' : 'pill'}
            onClick={() => setOrder((o) => (o === 'random' ? 'sequential' : 'random'))}
          >
            <ReplayIcon />
            {order === 'random' ? 'ランダム' : '登録順'}
          </button>
          <label className={continuous ? 'pill pill--toggled' : 'pill'}>
            <input
              type="checkbox"
              checked={continuous}
              onChange={(e) => setContinuous(e.target.checked)}
              style={{ display: 'none' }}
            />
            自動連続再生
          </label>
        </div>
      </div>

      <div className="listen-screen__scope">
        <button className={scope === 'both' ? 'pill pill--toggled' : 'pill'} onClick={() => setScope('both')}>
          両方
        </button>
        <button className={scope === 'wordOnly' ? 'pill pill--toggled' : 'pill'} onClick={() => setScope('wordOnly')}>
          単語のみ
        </button>
        <button
          className={scope === 'exampleOnly' ? 'pill pill--toggled' : 'pill'}
          onClick={() => setScope('exampleOnly')}
        >
          例文のみ
        </button>
      </div>

      <div className="listen-screen__stage">
        <button className="listen-screen__play" onClick={play} aria-label="再生">
          <PlayIcon />
        </button>

        {revealed && current ? (
          <div className="listen-screen__reveal">
            {(() => {
              const item =
                scope === 'exampleOnly'
                  ? current.examples[playingIndex]
                  : playingIndex === 0
                    ? current
                    : current.examples[playingIndex - 1];
              if (!item) return null;
              return (
                <>
                  <div className="listen-screen__reveal-hanzi">{item.hanzi}</div>
                  <div className="listen-screen__reveal-zhuyin">{item.zhuyin}</div>
                  <div className="listen-screen__reveal-meaning">{item.meaning}</div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="listen-screen__reveal-hint">長押しで文字を表示</div>
        )}
      </div>

      <div className="listen-screen__controls">
        <button className="listen-screen__ctrl" onClick={prev} aria-label="前">
          <PrevIcon />
        </button>
        <button className="listen-screen__ctrl" onClick={play} aria-label="もう一度">
          <ReplayIcon />
        </button>
        <button
          className="listen-screen__ctrl listen-screen__ctrl--eye"
          aria-label="文字を見る"
          onPointerDown={(e) => {
            e.preventDefault();
            setRevealed(true);
          }}
          onPointerUp={() => setRevealed(false)}
          onPointerLeave={() => setRevealed(false)}
          onPointerCancel={() => setRevealed(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <EyeIcon />
        </button>
        <button className="listen-screen__ctrl" onClick={next} aria-label="次">
          <NextIcon />
        </button>
      </div>
    </div>
  );
}
