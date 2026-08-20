import { useEffect, useState } from 'react';
import type { Card } from '../../core/types';
import { grade, type Grade } from '../../core/srs';
import { listCards, putCard } from '../../data/db';
import { SpeechQueue, pickTaiwaneseVoice } from '../../audio/speech';

type Direction = 'hanziToMeaning' | 'meaningToHanzi' | 'audioToMeaning';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function speak(text: string) {
  const voice = pickTaiwaneseVoice(window.speechSynthesis.getVoices());
  const q = new SpeechQueue(window.speechSynthesis, voice);
  q.enqueue(text);
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
      speak(current.hanzi);
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
        <label>
          <input
            type="radio"
            name="direction"
            aria-label="中文 → 意味"
            checked={direction === 'hanziToMeaning'}
            onChange={() => setDirection('hanziToMeaning')}
          />
          中文 → 意味
        </label>
        <label>
          <input
            type="radio"
            name="direction"
            aria-label="意味 → 中文"
            checked={direction === 'meaningToHanzi'}
            onChange={() => setDirection('meaningToHanzi')}
          />
          意味 → 中文
        </label>
        <label>
          <input
            type="radio"
            name="direction"
            aria-label="音声 → 意味"
            checked={direction === 'audioToMeaning'}
            onChange={() => setDirection('audioToMeaning')}
          />
          音声 → 意味
        </label>
        <button onClick={startSession}>開始</button>
      </div>
    );
  }

  if (!current) {
    return <div className="quiz-screen quiz-screen--done">終了しました</div>;
  }

  return (
    <div className="quiz-screen">
      <div className="quiz-screen__prompt">
        {direction === 'meaningToHanzi' && current.meaning}
        {direction === 'hanziToMeaning' && (
          <>
            <div>{current.hanzi}</div>
            <div>{current.zhuyin}</div>
          </>
        )}
        {direction === 'audioToMeaning' && (
          <button onClick={() => speak(current.hanzi)} aria-label="再生">🔊</button>
        )}
      </div>

      {!flipped && <button onClick={() => setFlipped(true)}>答えを見る</button>}

      {flipped && (
        <div className="quiz-screen__answer">
          {direction === 'meaningToHanzi' && (
            <>
              <div>{current.hanzi}</div>
              <div>{current.zhuyin}</div>
            </>
          )}
          {(direction === 'hanziToMeaning' || direction === 'audioToMeaning') && <div>{current.meaning}</div>}
          <div className="quiz-screen__grades">
            <button onClick={() => onGrade('again')}>もう一度</button>
            <button onClick={() => onGrade('good')}>普通</button>
            <button onClick={() => onGrade('easy')}>簡単</button>
          </div>
        </div>
      )}
    </div>
  );
}
