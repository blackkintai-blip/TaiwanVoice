import { useState } from 'react';
import { TabBar, type Tab } from './ui/TabBar';
import { ListScreen } from './ui/screens/ListScreen';
import { CardEditScreen } from './ui/screens/CardEditScreen';
import { ListenScreen } from './ui/screens/ListenScreen';
import { QuizScreen } from './ui/screens/QuizScreen';

export default function App() {
  const [tab, setTab] = useState<Tab>('list');
  const [editingCardId, setEditingCardId] = useState<string | null | 'closed'>('closed');

  return (
    <div className="app">
      <div className="app__content">
        {tab === 'list' &&
          (editingCardId === 'closed' ? (
            <ListScreen onOpenCard={setEditingCardId} />
          ) : (
            <CardEditScreen cardId={editingCardId} onDone={() => setEditingCardId('closed')} />
          ))}
        {tab === 'listen' && <ListenScreen />}
        {tab === 'quiz' && <QuizScreen />}
        {tab === 'settings' && <div>設定画面</div>}
      </div>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
