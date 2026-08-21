import { useEffect, useState } from 'react';
import type { Card, Example } from '../../core/types';
import { newSrsState } from '../../core/srs';
import { annotate } from '../../core/bopomofo';
import { getCard, putCard, deleteCard, listTags } from '../../data/db';
import { useDict } from '../../dict/useDict';
import { SpeechQueue, pickTaiwaneseVoice } from '../../audio/speech';
import { PlusIcon, SpeakerIcon } from '../icons';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyCard(): Card {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    hanzi: '', zhuyin: '', zhuyinEdited: false, meaning: '',
    tags: [], note: '', examples: [],
    srs: newSrsState(todayStr()),
    createdAt: now, updatedAt: now,
  };
}

export function CardEditScreen({ cardId, onDone }: { cardId: string | null; onDone: () => void }) {
  const { dict } = useDict();
  const [card, setCard] = useState<Card>(emptyCard());
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (cardId) {
      getCard(cardId).then((c) => {
        if (c) setCard(c);
      });
    }
    listTags().then(setAllTags);
  }, [cardId]);

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    setCard((c) => (c.tags.includes(tag) ? c : { ...c, tags: [...c.tags, tag] }));
    setTagInput('');
  }

  function removeTag(tag: string) {
    setCard((c) => ({ ...c, tags: c.tags.filter((t) => t !== tag) }));
  }

  function updateHanzi(hanzi: string) {
    setCard((c) => ({
      ...c,
      hanzi,
      zhuyin: c.zhuyinEdited || !dict ? c.zhuyin : annotate(hanzi, dict),
    }));
  }

  function addExample() {
    const example: Example = { hanzi: '', zhuyin: '', zhuyinEdited: false, meaning: '' };
    setCard((c) => ({ ...c, examples: [...c.examples, example] }));
  }

  function updateExample(index: number, patch: Partial<Example>) {
    setCard((c) => {
      const examples = [...c.examples];
      const current = examples[index];
      const next = { ...current, ...patch };
      if (patch.hanzi !== undefined && !current.zhuyinEdited && dict) {
        next.zhuyin = annotate(patch.hanzi, dict);
      }
      examples[index] = next;
      return { ...c, examples };
    });
  }

  function speak(text: string) {
    const voice = pickTaiwaneseVoice(window.speechSynthesis.getVoices());
    const q = new SpeechQueue(window.speechSynthesis, voice);
    q.enqueue(text);
    q.start();
  }

  async function save() {
    const toSave: Card = { ...card, updatedAt: new Date().toISOString() };
    await putCard(toSave);
    onDone();
  }

  async function remove() {
    if (cardId) await deleteCard(cardId);
    onDone();
  }

  return (
    <div className="card-edit">
      <div className="list-screen__titlebar">{cardId ? 'カードを編集' : 'カードを追加'}</div>

      <label>
        中文
        <input value={card.hanzi} onChange={(e) => updateHanzi(e.target.value)} />
      </label>
      <div className="card-edit__zhuyin-row">
        <input
          value={card.zhuyin}
          onChange={(e) => setCard((c) => ({ ...c, zhuyin: e.target.value, zhuyinEdited: true }))}
        />
        <button onClick={() => speak(card.hanzi)} aria-label="試聴">
          <SpeakerIcon />
        </button>
      </div>
      <label>
        意味
        <input value={card.meaning} onChange={(e) => setCard((c) => ({ ...c, meaning: e.target.value }))} />
      </label>
      <div className="card-edit__field">
        タグ
        <div className="card-edit__tags">
          {card.tags.map((tag) => (
            <button key={tag} type="button" className="pill pill--toggled" onClick={() => removeTag(tag)}>
              {tag} ×
            </button>
          ))}
          <input
            className="card-edit__tag-input"
            placeholder="タグを入力してEnter"
            value={tagInput}
            onChange={(e) => {
              if (e.target.value.endsWith(',')) {
                addTag(e.target.value.slice(0, -1));
              } else {
                setTagInput(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
          />
        </div>
        {allTags.filter((t) => !card.tags.includes(t)).length > 0 && (
          <div className="card-edit__tag-suggestions">
            {allTags.filter((t) => !card.tags.includes(t)).map((tag) => (
              <button key={tag} type="button" className="pill" onClick={() => addTag(tag)}>
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
      <label>
        メモ
        <textarea value={card.note} onChange={(e) => setCard((c) => ({ ...c, note: e.target.value }))} />
      </label>

      <h3>例文</h3>
      {card.examples.map((ex, i) => (
        <div key={i} className="card-edit__example">
          <div className="card-edit__example-row">
            <input placeholder="中文" value={ex.hanzi} onChange={(e) => updateExample(i, { hanzi: e.target.value })} />
            <button onClick={() => speak(ex.hanzi)} aria-label="例文を試聴">
              <SpeakerIcon />
            </button>
          </div>
          <input
            className="card-edit__example-sub"
            placeholder="注音"
            value={ex.zhuyin}
            onChange={(e) => updateExample(i, { zhuyin: e.target.value, zhuyinEdited: true })}
          />
          <input
            className="card-edit__example-sub"
            placeholder="意味"
            value={ex.meaning}
            onChange={(e) => updateExample(i, { meaning: e.target.value })}
          />
        </div>
      ))}
      <button className="ghost-btn" onClick={addExample} style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
        <PlusIcon style={{ width: 15, height: 15 }} />
        例文を追加
      </button>

      <div className="card-edit__actions">
        <button className="primary-btn" onClick={save}>保存</button>
        {cardId && <button className="ghost-btn" onClick={remove}>削除</button>}
        <button className="ghost-btn" onClick={onDone}>キャンセル</button>
      </div>
    </div>
  );
}
