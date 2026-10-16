'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { SRM_STATUS_LABEL, isSrmStatus } from '@/lib/srm-status';
import type { CleanupMatching, MatchingCleanup } from '@/lib/matching-cleanup';

interface Props { adminKey: string; reloadKey: number; onSelectStudentById: (id: string) => void }

/** 2026-06-13T… → 26.06.13 */
const day = (iso: string | null) => (iso ? iso.slice(2, 10).replace(/-/g, '.') : null);

async function fetchCleanup(adminKey: string): Promise<MatchingCleanup | null> {
  try {
    const res = await fetch('/api/crm/coach-roster/cleanup', { headers: { 'x-admin-key': adminKey } });
    const json = (await res.json().catch(() => null)) as { data?: MatchingCleanup } | null;
    return res.ok && Array.isArray(json?.data?.stale) && Array.isArray(json?.data?.unclear) ? json!.data! : null;
  } catch {
    return null;
  }
}

function Student({ name, crmStudentId, subject, status, onOpen }: { name: string; crmStudentId: string | null; subject: string; status: string; onOpen: (id: string) => void }) {
  return (
    <span className="flex items-center gap-1.5">
      {crmStudentId
        ? <button onClick={() => onOpen(crmStudentId)} className="font-medium text-gray-900 hover:text-blue-600 hover:underline">{name}</button>
        : <span className="font-medium italic text-gray-700" title="CRM 미연결 — SRM 이름">{name}</span>}
      <span className="rounded border border-gray-200 px-1 text-[10px] text-gray-500">{subject}</span>
      {status !== 'active' && <span className="text-[10px] text-gray-400">{isSrmStatus(status) ? SRM_STATUS_LABEL[status] : status}</span>}
    </span>
  );
}

function MatchingLine({ m }: { m: CleanupMatching }) {
  return (
    <span className="text-gray-500">
      <span className="font-medium text-gray-700">{m.coach}</span>
      {' · '}{m.lastLesson ? `마지막 수업 ${day(m.lastLesson)}` : '수업 기록 없음'}
      {m.entryCode && <> · 코드 <span className="font-mono">{m.entryCode}</span></>}
    </span>
  );
}

function Section({ testId, title, hint, children }: { testId: string; title: string; hint: string; children: ReactNode }) {
  return (
    <section data-testid={testId}>
      <h4 className="text-[13px] font-semibold text-gray-800">{title}</h4>
      <p className="mb-1.5 text-[11px] text-gray-400">{hint}</p>
      <ul className="divide-y divide-gray-100">{children}</ul>
    </section>
  );
}

// 코치 현황 오른쪽 — SRM에서 Deactivate해야 할 진행 중 매칭
export function MatchingCleanupPanel({ adminKey, reloadKey, onSelectStudentById }: Props) {
  // 마지막으로 받은 결과와 그 reloadKey — 다시 불러오는 동안에는 이전 목록을 그대로 보여 준다
  const [result, setResult] = useState<{ key: number; data: MatchingCleanup | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCleanup(adminKey).then((d) => { if (!cancelled) setResult({ key: reloadKey, data: d }); });
    return () => { cancelled = true; };
  }, [adminKey, reloadKey]);

  const loading = result?.key !== reloadKey;
  const data = result?.data ?? null;
  const state = loading ? 'loading' : data ? 'loaded' : 'error';

  return (
    <aside className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 text-[12px]">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">매칭 정리 필요</h3>
        <p className="text-[11px] text-gray-400">SRM에서 매칭을 Deactivate하면 다음 새로고침 때 빠집니다.</p>
      </div>
      {state === 'loading' && !data && <p className="flex items-center gap-2 text-gray-400"><Loader2 size={14} className="animate-spin" /> 불러오는 중…</p>}
      {state === 'error' && <p role="alert" className="text-red-500">매칭 정리 목록을 불러오지 못했습니다.</p>}
      {data && state !== 'error' && (data.stale.length + data.unclear.length === 0
        ? <p className="text-gray-400">정리할 매칭이 없습니다</p>
        : (
          <>
            {data.stale.length > 0 && (
              <Section testId="cleanup-stale" title={`Deactivate 추천 ${data.stale.length}건`} hint="같은 과목의 다른 매칭으로 최근 4주 안에 수업했거나 예정 수업이 있음 — 이 매칭은 정리">
                {data.stale.map((s) => (
                  <li key={`${s.matchingId}|${s.profileId}`} className="space-y-0.5 py-1.5">
                    <Student name={s.student} crmStudentId={s.crmStudentId} subject={s.subject} status={s.status} onOpen={onSelectStudentById} />
                    <div><MatchingLine m={s} /></div>
                    <div className="text-[11px] text-emerald-700">지금 수업: {s.keepCoaches.join(', ')}</div>
                  </li>
                ))}
              </Section>
            )}
            {data.unclear.length > 0 && (
              <Section testId="cleanup-unclear" title={`확인 필요 ${data.unclear.length}명`} hint="매칭이 여러 건인데 최근 4주·예정 수업이 없음 — 남길 코치를 정하고 나머지 정리">
                {data.unclear.map((g) => (
                  <li key={`${g.profileId}|${g.subject}`} className="space-y-0.5 py-1.5">
                    <Student name={g.student} crmStudentId={g.crmStudentId} subject={g.subject} status={g.status} onOpen={onSelectStudentById} />
                    {g.matchings.map((m) => <div key={m.matchingId}><MatchingLine m={m} /></div>)}
                  </li>
                ))}
              </Section>
            )}
          </>
        ))}
    </aside>
  );
}
