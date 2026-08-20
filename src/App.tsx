import { useState } from 'react';
import { TabBar, type Tab } from './ui/TabBar';

export default function App() {
  const [tab, setTab] = useState<Tab>('list');

  return (
    <div className="app">
      <div className="app__content">
        {tab === 'list' && <div>一覧画面</div>}
        {tab === 'listen' && <div>聞く画面</div>}
        {tab === 'quiz' && <div>出題画面</div>}
        {tab === 'settings' && <div>設定画面</div>}
      </div>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
