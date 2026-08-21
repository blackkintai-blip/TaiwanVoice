import { useEffect, useMemo, useState } from 'react';
import type { Card } from '../../core/types';
import { listCards, listTags } from '../../data/db';
import { SpeechQueue, pickTaiwaneseVoice } from '../../audio/speech';
import { PlusIcon, SearchIcon, SpeakerIcon } from '../icons';

export function ListScreen({ onOpenCard }: { onOpenCard: (id: string | null) => void }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  useEffect(() => {
    listCards().then(setCards);
    listTags().then(setTags);
  }, []);

  function toggleTag(tag: string) {
    setActiveTags((tags) => (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]));
  }

  const filtered = useMemo(
    () =>
      cards.filter((c) => {
        const matchesQuery =
          query === '' || c.hanzi.includes(query) || c.meaning.includes(query) || c.tags.some((t) => t.includes(query));
        const matchesTags = activeTags.length === 0 || activeTags.some((t) => c.tags.includes(t));
        return matchesQuery && matchesTags;
      }),
    [cards, query, activeTags],
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

      {tags.length > 0 && (
        <div className="list-screen__tags">
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
                {card.tags.length > 0 && (
                  <div className="list-screen__card-tags">
                    {card.tags.map((tag) => (
                      <span key={tag} className="list-screen__card-tag">{tag}</span>
                    ))}
                  </div>
                )}
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
