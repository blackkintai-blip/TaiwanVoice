import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '../../core/types';
import { listCards, listTags } from '../../data/db';
import { pickTaiwaneseVoice, playRepeated } from '../../audio/speech';
import { startMicRecording, supportsMicRecording, type RecordingHandle } from '../../audio/recorder';
import { loadPlaybackSettings } from '../../data/settings';
import { EyeIcon, MicIcon, NextIcon, PlayIcon, PrevIcon, ReplayIcon, StopIcon } from '../icons';

type RecordingStatus = 'idle' | 'requesting' | 'recording' | 'recorded' | 'denied';

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
  const [tags, setTags] = useState<string[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [order, setOrder] = useState<Order>('sequential');
  const [scope, setScope] = useState<Scope>('both');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [continuous, setContinuous] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(0);
  const sessionRef = useRef<{ stop: () => void } | null>(null);

  const canRecord = useMemo(() => supportsMicRecording(), []);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const recorderRef = useRef<RecordingHandle | null>(null);
  const recordedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    listCards().then(setCards);
    listTags().then(setTags);
  }, []);

  function toggleTag(tag: string) {
    setActiveTags((tags) => (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]));
  }

  const byTag = useMemo(
    () => (activeTags.length === 0 ? cards : cards.filter((c) => activeTags.some((t) => c.tags.includes(t)))),
    [cards, activeTags],
  );

  const scoped = useMemo(
    () => (scope === 'exampleOnly' ? byTag.filter((c) => c.examples.length > 0) : byTag),
    [byTag, scope],
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

  function discardRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    recordedAudioRef.current?.pause();
    setRecordingUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    setRecordingStatus((s) => (s === 'denied' ? s : 'idle'));
  }

  useEffect(() => discardRecording, []);

  // Any change to which item is currently being listened to (a new card, or
  // moving from the word to one of its examples within the same card)
  // invalidates the in-progress or just-finished recording per spec: nothing
  // is persisted, so a recording only ever applies to the single item it was
  // made against.
  useEffect(() => {
    discardRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, playingIndex]);

  async function toggleRecording() {
    if (recordingStatus === 'recording' || recordingStatus === 'requesting') {
      recorderRef.current?.stop();
      return;
    }
    if (recordingStatus === 'denied') return;

    discardRecording();
    stopPlayback();
    setContinuous(false);
    setRecordingStatus('requesting');
    try {
      const handle = await startMicRecording();
      recorderRef.current = handle;
      setRecordingStatus('recording');
      handle.result.then((rec) => {
        if (recorderRef.current !== handle) return;
        recorderRef.current = null;
        setRecordingUrl(rec.url);
        setRecordingStatus('recorded');
      });
    } catch {
      recorderRef.current = null;
      setRecordingStatus('denied');
    }
  }

  function playRecording() {
    if (!recordingUrl) return;
    const audio = recordedAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
  }

  useEffect(() => {
    stopPlayback();
    setPlayingIndex(0);
    setIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, order, activeTags]);

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
    const message =
      cards.length === 0
        ? 'カードがありません'
        : activeTags.length > 0
          ? '選択したラベルに一致するカードがありません'
          : scope === 'exampleOnly'
            ? '例文のあるカードがありません'
            : 'カードがありません';
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

      {tags.length > 0 && (
        <div className="listen-screen__tags">
          {tags.map((tag) => (
            <button
              key={tag}
              className={activeTags.includes(tag) ? 'pill pill--toggled' : 'pill'}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

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
        {canRecord && recordingStatus !== 'denied' && (
          <>
            <button
              className={
                recordingStatus === 'recording' || recordingStatus === 'requesting'
                  ? 'listen-screen__ctrl listen-screen__ctrl--sm listen-screen__ctrl--recording'
                  : 'listen-screen__ctrl listen-screen__ctrl--sm'
              }
              onClick={toggleRecording}
              aria-label={recordingStatus === 'recording' ? '録音を停止' : '発音を録音'}
            >
              {recordingStatus === 'recording' || recordingStatus === 'requesting' ? <StopIcon /> : <MicIcon />}
            </button>
            <button
              className="listen-screen__ctrl listen-screen__ctrl--sm"
              onClick={playRecording}
              disabled={recordingStatus !== 'recorded'}
              aria-label="録音を再生"
            >
              <PlayIcon />
            </button>
          </>
        )}
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

      {canRecord && recordingStatus === 'denied' && (
        <div className="listen-screen__record-denied">マイクが使用できません</div>
      )}

      <audio ref={recordedAudioRef} src={recordingUrl ?? undefined} style={{ display: 'none' }} />
    </div>
  );
}
