import { useEffect, useMemo, useState } from 'react';
import type { Card } from '../../core/types';
import { listCards } from '../../data/db';
import { SpeechQueue, pickTaiwaneseVoice } from '../../audio/speech';

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
      <input placeholder="検索" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {filtered.map((card) => (
          <li key={card.id} onClick={() => onOpenCard(card.id)} onDoubleClick={() => speak(card.hanzi)}>
            <button
              className="list-screen__speak"
              onClick={(e) => {
                e.stopPropagation();
                speak(card.hanzi);
              }}
              aria-label={`${card.hanzi} を発音`}
            >
              🔊
            </button>
            {card.hanzi}
          </li>
        ))}
      </ul>
      <button className="list-screen__add" onClick={() => onOpenCard(null)}>
        ＋
      </button>
    </div>
  );
}
