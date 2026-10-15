'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, Loader2, RefreshCw } from 'lucide-react';
import { apiErrorCode } from '@/lib/api-error';
import type { CoachSubjectLedger } from '@/lib/coach-room-ledger';
import { CoachRoomSubject } from './CoachRoomSubject';

type Status = 'loading' | 'loaded' | 'unlinked' | 'error';

interface Props { studentId: string; adminKey: string; className?: string }

type Result = { status: Exclude<Status, 'loading'>; subjects: CoachSubjectLedger[] };

async function fetchLedger(studentId: string, adminKey: string): Promise<Result> {
  try {
    const res = await fetch(`/api/crm/students/${studentId}/coach-room`, { headers: { 'x-admin-key': adminKey } });
    const json = await res.json().catch(() => ({}));
    if (res.status === 404 && apiErrorCode(json) === 'no_v2_profile') return { status: 'unlinked', subjects: [] };
    if (!res.ok) return { status: 'error', subjects: [] };
    // 응답 형식이 다르면(프록시·목업 등) 카드만 오류로 두고 패널 전체를 깨뜨리지 않는다
    const subjects = (json as { data?: { subjects?: unknown } }).data?.subjects;
    if (!Array.isArray(subjects)) return { status: 'error', subjects: [] };
    return { status: 'loaded', subjects: subjects as CoachSubjectLedger[] };
  } catch {
    return { status: 'error', subjects: [] };
  }
}

// CRM 학생 패널 맨 왼쪽 카드 — 코치룸 수업 내역과 등록 시간 대비 진행 시간.
// 계산은 SRM 관리자 Payment 상세와 같다(/api/crm/students/[id]/coach-room). 가벼워서 열리면 바로 불러온다.
export function CoachRoomCard({ studentId, adminKey, className }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [subjects, setSubjects] = useState<CoachSubjectLedger[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchLedger(studentId, adminKey).then((r) => {
      if (cancelled) return;
      setSubjects(r.subjects);
      setStatus(r.status);
    });
    return () => { cancelled = true; };
  }, [studentId, adminKey, reloadKey]);

  const load = () => { setStatus('loading'); setReloadKey((k) => k + 1); };

  return (
    <div className={className ?? 'relative hidden xl:flex w-full max-w-[380px] bg-white border-l border-gray-200 flex-col h-full overflow-hidden shadow-xl'}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <CalendarCheck size={16} className="text-blue-500" />
        <span className="text-sm font-semibold text-gray-800">코치룸 수업 내역</span>
        {status === 'loaded' && (
          <button onClick={load} className="ml-auto flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 transition-colors">
            <RefreshCw size={12} /> 새로고침
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> 불러오는 중…
          </div>
        )}
        {status === 'unlinked' && <p className="text-center py-10 text-xs text-gray-400">SRM 계정이 연결되지 않았습니다.</p>}
        {status === 'error' && (
          <div className="text-center py-10 space-y-2">
            <p className="text-sm text-red-500">수업 내역을 불러오지 못했습니다.</p>
            <button onClick={load} className="text-xs text-blue-500 hover:text-blue-700">다시 시도</button>
          </div>
        )}
        {status === 'loaded' && subjects.length === 0 && <p className="text-center py-10 text-xs text-gray-400">결제·수업 내역이 없습니다.</p>}
        {status === 'loaded' && subjects.map((s) => <CoachRoomSubject key={s.subject} ledger={s} />)}
        {status === 'loaded' && subjects.length > 0 && (
          <p className="text-[10px] text-gray-400 leading-relaxed">
            · SRM 관리자 Payment 화면과 같은 기준: 잔여 = 결제 − 환불 − 완료 수업. 예정·확인 대기 수업은 차감 전. 시간은 한국 시간.
          </p>
        )}
      </div>
    </div>
  );
}
