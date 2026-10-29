import type { ReactNode } from 'react';
import { T } from '@/lib/guide/targets';

type NavKey = 'Home' | 'Schedule' | 'Coach Room' | 'Vocab Gym' | 'Test Center' | 'Study Hall';

const NAV: { key: NavKey; target?: string }[] = [
  { key: 'Home' },
  { key: 'Schedule', target: T.navSchedule },
  { key: 'Coach Room' },
  { key: 'Vocab Gym' },
  { key: 'Test Center', target: T.navTestCenter },
  { key: 'Study Hall', target: T.navStudyHall },
];

interface Props {
  active: NavKey;
  dark?: boolean;
  children: ReactNode;
}

// v2 앱 셸을 단순화한 모형. 실제 v2 는 왼쪽 사이드바이고, 좁은 폭에서는 상단 메뉴로 접어 보여준다.
export default function AppFrame({ active, dark = false, children }: Props) {
  const tone = dark ? 'bg-[#0b0b0c] text-white' : 'bg-white text-gray-900';
  return (
    <div className={`relative mx-auto flex h-[540px] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-200 ${tone}`}>
      <header className={`border-b px-3 py-2 ${dark ? 'border-white/10' : 'border-gray-100'}`}>
        <p className="mb-1.5 text-sm font-bold italic text-[#071be9]">Superfast SAT</p>
        <nav className="flex flex-wrap gap-1 text-xs">
          {NAV.map(({ key, target }) => (
            <button
              key={key}
              type="button"
              {...(target ? { 'data-tutorial-id': target } : {})}
              className={`rounded-md px-2 py-1 ${
                key === active ? (dark ? 'bg-white font-semibold text-black' : 'bg-gray-900 font-semibold text-white') : 'opacity-70'
              }`}
            >
              {key}
            </button>
          ))}
        </nav>
      </header>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
