'use client';

import { useEffect, useState } from 'react';
import type { ContactTask, ContactTaskGroup } from '@/lib/contact-tasks';
import { formatHours, formatKstDateTime, formatKstMonthDay } from '../../briefing/format';
import { workLogApi } from '../api';

type Loaded = Awaited<ReturnType<typeof workLogApi.contactTasks>>;

function taskDetail(t: ContactTask): string {
  if (t.studentNames) return `미예약 학생 ${t.studentNames.length}명: ${t.studentNames.join(', ')}`;
  return [
    t.coachNames && `코치 ${t.coachNames.join(', ')}`,
    t.lastDate && `마지막 일정 ${formatKstMonthDay(t.lastDate)}`,
    t.remainingHours !== undefined && `잔여 수업 ${formatHours(t.remainingHours)}`,
  ].filter(Boolean).join(' · ');
}

function Group({ group }: { group: ContactTaskGroup }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <h2 className="border-b border-gray-200 px-3 py-2 text-sm font-bold">
        {group.title} <span className="text-gray-400">{group.tasks.length}{group.target === '코치' ? '명(코치)' : '명'}</span>
      </h2>
      {group.tasks.length === 0 ? <p className="px-3 py-3 text-xs text-gray-400">연락할 대상이 없습니다.</p> : (
        <ul>
          {group.tasks.map(t => (
            <li key={t.targetId} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gray-100 px-3 py-2 text-sm last:border-b-0">
              <span className="font-medium">{t.name}</span>
              {t.isNew && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">신규</span>}
              <span className="text-xs text-gray-500">{taskDetail(t)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** 알바생이 해야 할 연락 업무. refreshKey 가 바뀔 때마다 tutoring 데이터로 다시 계산한다 */
export function ContactTasks({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<number | null>(null);
  const loading = loadedKey !== refreshKey;

  useEffect(() => {
    workLogApi.contactTasks()
      .then(d => { setData(d); setError(null); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '불러오지 못했습니다.'))
      .finally(() => setLoadedKey(refreshKey));
  }, [refreshKey]);

  if (error && !loading) return <p role="alert" className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-xs text-gray-400">최신 스케줄을 계산하는 중…</p>;

  const total = data.groups.reduce((n, g) => n + g.tasks.length, 0);
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        {formatKstDateTime(data.generatedAt)} 기준 · 연락 대상 {total}건
        {loading && <span className="ml-2 text-gray-400">최신 정보로 다시 계산하는 중…</span>}
      </p>
      {data.groups.map(g => <Group key={g.kind} group={g} />)}
    </div>
  );
}
