import { useEffect, useMemo, useState } from 'react';
import type { Card } from '../../core/types';
import { listCards } from '../../data/db';
import { SpeechQueue, pickTaiwaneseVoice } from '../../audio/speech';
import { PlusIcon, SearchIcon, SpeakerIcon } from '../icons';

export function ListScreen({ onOpenCard }: { onOpenCard: (id: string | null) => void }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    listCards().then(setCards);
  }, []);

  const filtered = useMemo(
    () => cards.filter((c) => c.hanzi.includes(query) || c.meaning.includes(query)),
    [cards, query],
  );

  function speak(hanzi: string) {
    const voice = pickTaiwaneseVoice(window.speechSynthesis.getVoices());
    const q = new SpeechQueue(window.speechSynthesis, voice);
    q.enqueue(hanzi);
    q.start();
  }

  return (
    <div className="list-screen">
      <div className="list-screen__titlebar">一覧</div>
      <div className="list-screen__search">
        <SearchIcon />
        <input placeholder="検索" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="list-screen__empty">
          {cards.length === 0 ? 'カードがありません' : '見つかりませんでした'}
        </div>
      ) : (
        <ul>
          {filtered.map((card) => (
            <li key={card.id} onClick={() => onOpenCard(card.id)} onDoubleClick={() => speak(card.hanzi)}>
              <div className="list-screen__main">
                <div className="list-screen__hanzi">{card.hanzi}</div>
                <div className="list-screen__zhuyin">{card.zhuyin}</div>
                <div className="list-screen__meaning">{card.meaning}</div>
              </div>
              <button
                className="list-screen__speak"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(card.hanzi);
                }}
                aria-label={`${card.hanzi} を発音`}
              >
                <SpeakerIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button className="list-screen__add" onClick={() => onOpenCard(null)} aria-label="＋">
        <PlusIcon />
      </button>
    </div>
  );
}
