import { useEffect, useState } from 'react';
import type { Card } from '../../core/types';
import { grade, type Grade } from '../../core/srs';
import { listCards, listTags, putCard } from '../../data/db';
import { SpeechQueue, pickTaiwaneseVoice } from '../../audio/speech';
import { SpeakerIcon } from '../icons';

type Direction = 'hanziToMeaning' | 'meaningToHanzi' | 'audioToMeaning';
type Scope = 'both' | 'wordOnly' | 'exampleOnly';

type QuizItem = {
  card: Card;
  kind: 'word' | 'example';
  hanzi: string;
  zhuyin: string;
  meaning: string;
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildItems(cards: Card[], scope: Scope): QuizItem[] {
  const items: QuizItem[] = [];
  for (const card of cards) {
    if (scope !== 'exampleOnly') {
      items.push({ card, kind: 'word', hanzi: card.hanzi, zhuyin: card.zhuyin, meaning: card.meaning });
    }
    if (scope !== 'wordOnly') {
      for (const ex of card.examples) {
        items.push({ card, kind: 'example', hanzi: ex.hanzi, zhuyin: ex.zhuyin, meaning: ex.meaning });
      }
    }
  }
  return items;
}

function speakText(hanzi: string) {
  const voice = pickTaiwaneseVoice(window.speechSynthesis.getVoices());
  const q = new SpeechQueue(window.speechSynthesis, voice);
  q.enqueue(hanzi);
  q.start();
}

export function QuizScreen() {
  const [direction, setDirection] = useState<Direction>('hanziToMeaning');
  const [scope, setScope] = useState<Scope>('both');
  const [tags, setTags] = useState<string[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [items, setItems] = useState<QuizItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    listTags().then(setTags);
  }, []);

  function toggleTag(tag: string) {
    setActiveTags((tags) => (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]));
  }

  function startSession() {
    listCards().then((all) => {
      const filtered =
        activeTags.length === 0 ? all : all.filter((c) => activeTags.some((t) => c.tags.includes(t)));
      setItems(buildItems(filtered, scope));
      setIndex(0);
      setFlipped(false);
    });
  }

  const current = items?.[index];

  useEffect(() => {
    if (direction === 'audioToMeaning' && current && !flipped) {
      speakText(current.hanzi);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, flipped, direction]);

  async function onGrade(choice: Grade) {
    if (!current) return;
    const updated: Card = {
      ...current.card,
      srs: grade(current.card.srs, choice, todayStr()),
      updatedAt: new Date().toISOString(),
    };
    await putCard(updated);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  if (!items) {
    return (
      <div className="quiz-screen quiz-screen--setup">
        <label className="quiz-screen__direction">
          <input
            type="radio"
            name="direction"
            aria-label="中文 → 意味"
            checked={direction === 'hanziToMeaning'}
            onChange={() => setDirection('hanziToMeaning')}
          />
          中文 → 意味
        </label>
        <label className="quiz-screen__direction">
          <input
            type="radio"
            name="direction"
            aria-label="意味 → 中文"
            checked={direction === 'meaningToHanzi'}
            onChange={() => setDirection('meaningToHanzi')}
          />
          意味 → 中文
        </label>
        <label className="quiz-screen__direction">
          <input
            type="radio"
            name="direction"
            aria-label="音声 → 意味"
            checked={direction === 'audioToMeaning'}
            onChange={() => setDirection('audioToMeaning')}
          />
          音声 → 意味
        </label>
        <label className="quiz-screen__direction">
          <input
            type="radio"
            name="scope"
            aria-label="両方"
            checked={scope === 'both'}
            onChange={() => setScope('both')}
          />
          両方（単語＋例文）
        </label>
        <label className="quiz-screen__direction">
          <input
            type="radio"
            name="scope"
            aria-label="単語のみ"
            checked={scope === 'wordOnly'}
            onChange={() => setScope('wordOnly')}
          />
          単語のみ
        </label>
        <label className="quiz-screen__direction">
          <input
            type="radio"
            name="scope"
            aria-label="例文のみ"
            checked={scope === 'exampleOnly'}
            onChange={() => setScope('exampleOnly')}
          />
          例文のみ
        </label>
        {tags.length > 0 && (
          <div className="quiz-screen__tags">
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
        <button className="primary-btn" onClick={startSession} style={{ marginTop: 8 }}>
          開始
        </button>
      </div>
    );
  }

  if (!current) {
    return <div className="quiz-screen quiz-screen--done">終了しました</div>;
  }

  return (
    <div className="quiz-screen">
      <div className="quiz-screen__prompt">
        {direction === 'meaningToHanzi' && <div className="quiz-screen__prompt-meaning">{current.meaning}</div>}
        {direction === 'hanziToMeaning' && (
          <>
            <div className="quiz-screen__prompt-hanzi">{current.hanzi}</div>
            <div className="quiz-screen__prompt-zhuyin">{current.zhuyin}</div>
          </>
        )}
        {direction === 'audioToMeaning' && (
          <button className="quiz-screen__speak-btn" onClick={() => speakText(current.hanzi)} aria-label="再生">
            <SpeakerIcon />
          </button>
        )}
      </div>

      {!flipped && (
        <button className="primary-btn" onClick={() => setFlipped(true)}>
          答えを見る
        </button>
      )}

      {flipped && (
        <div className="quiz-screen__answer">
          {direction === 'meaningToHanzi' && (
            <>
              <div className="quiz-screen__prompt-hanzi">{current.hanzi}</div>
              <div className="quiz-screen__prompt-zhuyin">{current.zhuyin}</div>
            </>
          )}
          {(direction === 'hanziToMeaning' || direction === 'audioToMeaning') && (
            <div className="quiz-screen__prompt-meaning">{current.meaning}</div>
          )}
          {current.kind === 'word' && current.card.examples.length > 0 && (
            <div className="quiz-screen__examples">
              {current.card.examples.map((ex, i) => (
                <div key={i} className="quiz-screen__example">
                  {direction !== 'audioToMeaning' && (
                    <>
                      <div className="quiz-screen__example-hanzi">{ex.hanzi}</div>
                      <div className="quiz-screen__example-zhuyin">{ex.zhuyin}</div>
                    </>
                  )}
                  <div className="quiz-screen__example-meaning">{ex.meaning}</div>
                </div>
              ))}
            </div>
          )}
          <div className="quiz-screen__grades">
            <button className="quiz-screen__grade quiz-screen__grade--again" onClick={() => onGrade('again')}>
              もう一度
            </button>
            <button className="quiz-screen__grade quiz-screen__grade--good" onClick={() => onGrade('good')}>
              普通
            </button>
            <button className="quiz-screen__grade quiz-screen__grade--easy" onClick={() => onGrade('easy')}>
              簡単
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
