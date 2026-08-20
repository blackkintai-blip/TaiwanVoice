export type Tab = 'list' | 'listen' | 'quiz' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'list', label: '一覧' },
  { id: 'listen', label: '聞く' },
  { id: 'quiz', label: '出題' },
  { id: 'settings', label: '設定' },
];

export function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="tabbar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={tab.id === active ? 'tabbar__item tabbar__item--active' : 'tabbar__item'}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
