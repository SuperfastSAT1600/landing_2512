'use client';

import { useState } from 'react';
import { LoginForm } from '../briefing/components/LoginForm';
import { WorkItemRow } from './components/WorkItemRow';
import { useWorkLog } from './useWorkLog';

const FILTERS = [
  { key: 'open', label: '진행 중' },
  { key: 'done', label: '완료' },
  { key: 'all', label: '전체' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function WorkLogPage() {
  const { session, items, error, loading, load, login, logout, setStudent } = useWorkLog();
  const [filter, setFilter] = useState<FilterKey>('open');

  if (session === 'loading') return <p className="p-8 text-sm text-gray-400">불러오는 중…</p>;
  if (session === 'signed-out') return <LoginForm onLogin={login} />;

  const counts = { open: items.filter(i => !i.done).length, done: items.filter(i => i.done).length, all: items.length };
  const shown = items.filter(i => filter === 'all' || i.done === (filter === 'done'));

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-8">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight">업무 로그</h1>
        <button type="button" onClick={() => void load()} className="text-xs text-gray-500 underline">새로고침</button>
        <span className="ml-auto text-xs text-gray-500">{session.name}</span>
        <button type="button" onClick={() => void logout()} className="text-xs text-gray-500 underline">로그아웃</button>
      </header>

      <nav className="flex gap-2" aria-label="업무 상태">
        {FILTERS.map(f => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}
            className={filter === f.key ? 'rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white' : 'rounded bg-white px-3 py-1.5 text-xs text-gray-600 ring-1 ring-gray-200'}>
            {f.label} {counts[f.key]}
          </button>
        ))}
      </nav>

      {loading && <p className="text-xs text-gray-400">불러오는 중…</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {!loading && !error && shown.length === 0 && <p className="text-sm text-gray-500">표시할 업무가 없습니다.</p>}

      <ul className="space-y-2">
        {shown.map(i => <WorkItemRow key={i.messageTs} item={i} onSetStudent={setStudent} />)}
      </ul>
    </main>
  );
}
