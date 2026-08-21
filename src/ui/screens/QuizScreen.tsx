import { useEffect, useState } from 'react';
import type { Card } from '../../core/types';
import { grade, type Grade } from '../../core/srs';
import { listCards, putCard } from '../../data/db';
import { SpeechQueue, pickTaiwaneseVoice } from '../../audio/speech';
import { SpeakerIcon } from '../icons';

type Direction = 'hanziToMeaning' | 'meaningToHanzi' | 'audioToMeaning';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function speakCard(card: Card) {
  const voice = pickTaiwaneseVoice(window.speechSynthesis.getVoices());
  const q = new SpeechQueue(window.speechSynthesis, voice);
  q.enqueue(card.hanzi);
  for (const example of card.examples) q.enqueue(example.hanzi);
  q.start();
}

export function QuizScreen() {
  const [direction, setDirection] = useState<Direction>('hanziToMeaning');
  const [cards, setCards] = useState<Card[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  function startSession() {
    listCards().then((all) => {
      setCards(all);
      setIndex(0);
      setFlipped(false);
    });
  }

  const current = cards?.[index];

  useEffect(() => {
    if (direction === 'audioToMeaning' && current && !flipped) {
      speakCard(current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, flipped, direction]);

  async function onGrade(choice: Grade) {
    if (!current) return;
    const updated: Card = { ...current, srs: grade(current.srs, choice, todayStr()), updatedAt: new Date().toISOString() };
    await putCard(updated);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  if (!cards) {
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
          <button className="quiz-screen__speak-btn" onClick={() => speakCard(current)} aria-label="再生">
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
          {current.examples.length > 0 && (
            <div className="quiz-screen__examples">
              {current.examples.map((ex, i) => (
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
