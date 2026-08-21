import { TabListIcon, TabListenIcon, TabQuizIcon, TabSettingsIcon } from './icons';

export type Tab = 'list' | 'listen' | 'quiz' | 'settings';

const TABS: { id: Tab; label: string; Icon: typeof TabListIcon }[] = [
  { id: 'list', label: '一覧', Icon: TabListIcon },
  { id: 'listen', label: '聞く', Icon: TabListenIcon },
  { id: 'quiz', label: '出題', Icon: TabQuizIcon },
  { id: 'settings', label: '設定', Icon: TabSettingsIcon },
];

export function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="tabbar">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={id === active ? 'tabbar__item tabbar__item--active' : 'tabbar__item'}
          onClick={() => onChange(id)}
        >
          <Icon />
          {label}
        </button>
      ))}
    </nav>
  );
}
