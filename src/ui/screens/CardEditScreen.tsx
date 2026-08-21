import { useEffect, useState } from 'react';
import type { Card, Example } from '../../core/types';
import { newSrsState } from '../../core/srs';
import { annotate } from '../../core/bopomofo';
import { getCard, putCard, deleteCard } from '../../data/db';
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
  const [tagsText, setTagsText] = useState('');

  useEffect(() => {
    if (cardId) {
      getCard(cardId).then((c) => {
        if (c) {
          setCard(c);
          setTagsText(c.tags.join(', '));
        }
      });
    }
  }, [cardId]);

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
    const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
    const toSave: Card = { ...card, tags, updatedAt: new Date().toISOString() };
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
      <label>
        タグ（カンマ区切り）
        <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
      </label>
      <label>
        メモ
        <textarea value={card.note} onChange={(e) => setCard((c) => ({ ...c, note: e.target.value }))} />
      </label>

      <h3>例文</h3>
      {card.examples.map((ex, i) => (
        <div key={i} className="card-edit__example">
          <input value={ex.hanzi} onChange={(e) => updateExample(i, { hanzi: e.target.value })} />
          <input
            value={ex.zhuyin}
            onChange={(e) => updateExample(i, { zhuyin: e.target.value, zhuyinEdited: true })}
          />
          <input value={ex.meaning} onChange={(e) => updateExample(i, { meaning: e.target.value })} />
          <button onClick={() => speak(ex.hanzi)} aria-label="例文を試聴">
            <SpeakerIcon />
          </button>
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
