'use client';

import { BriefingSections } from './components/BriefingSections';
import { DateNav } from './components/DateNav';
import { LoginForm } from './components/LoginForm';
import { SummaryTiles } from './components/SummaryTiles';
import { useStaffBriefing } from './useStaffBriefing';

// 로그인·날짜 선택·연락 체크가 모두 이 한 주소(/staff/briefing)에서 이뤄진다.
export default function StaffBriefingPage() {
  const { session, date, availableDates, data, contacts, error, loading, loadDate, login, logout, addContact, removeContact } = useStaffBriefing();

  if (session === 'loading') return <p className="p-8 text-sm text-gray-400">불러오는 중…</p>;
  if (session === 'signed-out') return <LoginForm onLogin={login} />;

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-xl font-bold tracking-tight">스터디홀/보캡 스케줄 일일 브리핑</h1>
        <span className="ml-auto text-xs text-gray-500">{session.name}</span>
        <button type="button" onClick={() => void logout()} className="text-xs text-gray-500 underline">로그아웃</button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <DateNav date={date} onChange={d => void loadDate(d)} />
        {loading && <span className="text-xs text-gray-400">불러오는 중…</span>}
        {data && <span className="text-xs text-gray-400">발송 기준: 이 날 08:00 브리핑</span>}
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {!loading && !data && !error && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
          <p className="text-sm text-gray-600">{date}에 저장된 브리핑이 없습니다.</p>
          {availableDates.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              <span className="w-full text-xs text-gray-400">저장된 날짜</span>
              {availableDates.slice(0, 14).map(d => (
                <button key={d} type="button" onClick={() => void loadDate(d)} className="rounded-full border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50">{d}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {data && (
        <>
          <SummaryTiles payload={data.payload} />
          <BriefingSections payload={data.payload} contacts={contacts} briefingDate={data.date} now={new Date()} staffId={session.id}
            onContact={addContact} onRemove={removeContact} />
        </>
      )}
    </main>
  );
}
