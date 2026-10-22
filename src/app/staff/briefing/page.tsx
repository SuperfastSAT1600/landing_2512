'use client';

import { BriefingSections } from './components/BriefingSections';
import { DateNav } from './components/DateNav';
import { LoginForm } from './components/LoginForm';
import { useStaffBriefing } from './useStaffBriefing';

export default function StaffBriefingPage() {
  const { session, data, contacts, error, loading, loadDate, login, logout, addContact, removeContact } = useStaffBriefing();

  if (session === 'loading') return <p className="p-8 text-sm text-gray-400">불러오는 중…</p>;
  if (session === 'signed-out') return <LoginForm onLogin={login} />;

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-8">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight">스터디홀/보캡 스케줄 일일 브리핑</h1>
        {data && <DateNav date={data.date} availableDates={data.availableDates} onChange={d => void loadDate(d)} />}
        <span className="ml-auto text-xs text-gray-500">{session.name}</span>
        <button type="button" onClick={() => void logout()} className="text-xs text-gray-500 underline">로그아웃</button>
      </header>

      {loading && <p className="text-xs text-gray-400">불러오는 중…</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {!loading && !data && !error && <p className="text-sm text-gray-500">저장된 브리핑이 없습니다.</p>}

      {data && (
        <BriefingSections payload={data.payload} contacts={contacts} briefingDate={data.date} now={new Date()} staffId={session.id}
          onContact={addContact} onRemove={removeContact} />
      )}
    </main>
  );
}
