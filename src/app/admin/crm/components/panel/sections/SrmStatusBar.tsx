'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apiErrorCode } from '@/lib/api-error';
import { SRM_STATUSES, SRM_STATUS_LABEL, isSrmStatus } from '@/lib/srm-status';

export interface SubjectStatus { subject: string; status: string | null }

interface Props {
  studentId: string;
  adminKey: string;
  /** 처음 불러온 과목별 상태(미연결이면 빈 배열, 조회 실패면 호출하지 않는다) */
  onLoad: (subjects: SubjectStatus[]) => void;
  /** 상태를 바꾼 뒤의 과목별 상태 */
  onChange: (subjects: SubjectStatus[]) => void;
}

const TONE: Record<string, string> = {
  onboarding: 'border-sky-200 bg-sky-50 text-sky-700',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  paused: 'border-orange-200 bg-orange-50 text-orange-700',
  inactive: 'border-gray-200 bg-gray-50 text-gray-500',
  excluded: 'border-gray-200 bg-gray-50 text-gray-400',
};

const labelOf = (s: string | null) => (isSrmStatus(s) ? SRM_STATUS_LABEL[s] : s ?? '미지정');

function subjectsOf(json: unknown): SubjectStatus[] | null {
  const list = (json as { data?: { subjects?: unknown } } | null)?.data?.subjects;
  return Array.isArray(list) ? (list as SubjectStatus[]) : null;
}

/** 미연결이면 빈 배열, 조회 실패면 null */
async function fetchStatuses(studentId: string, adminKey: string): Promise<SubjectStatus[] | null> {
  try {
    const res = await fetch(`/api/crm/students/${studentId}/srm-status`, { headers: { 'x-admin-key': adminKey } });
    const json = await res.json().catch(() => null);
    if (res.status === 404 && apiErrorCode(json) === 'no_v2_profile') return [];
    return res.ok ? subjectsOf(json) : null;
  } catch {
    return null;
  }
}

// CRM 학생 패널 헤더 아래 — 과목별 수강 상태(SFv2 payments.management_status). 바꾸면 SRM 전체에 같은 값이 보인다.
export function SrmStatusBar({ studentId, adminKey, onLoad, onChange }: Props) {
  const [subjects, setSubjects] = useState<SubjectStatus[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 패널이 다른 학생으로 바뀐 뒤 늦게 온 응답은 버린다(부모는 key={student.id}로 새로 그린다)
  const alive = useRef(true);
  const onLoadRef = useRef(onLoad);
  useEffect(() => { onLoadRef.current = onLoad; });

  useEffect(() => {
    alive.current = true;
    fetchStatuses(studentId, adminKey).then((list) => {
      if (!alive.current) return;
      if (!list) { setError('수강 상태를 불러오지 못했습니다'); return; }
      setSubjects(list);
      onLoadRef.current(list);
    });
    return () => { alive.current = false; };
  }, [studentId, adminKey]);

  async function change(subject: string, from: string | null, to: string) {
    if (!window.confirm(`${subject} 수강 상태를 ${labelOf(from)} → ${labelOf(to)}(으)로 바꿉니다. SRM에도 바로 반영됩니다.`)) return;
    setSaving(subject);
    setError(null);
    try {
      const res = await fetch(`/api/crm/students/${studentId}/srm-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ subject, status: to }),
      });
      const json = await res.json().catch(() => null);
      if (!alive.current) return;
      const next = res.ok ? subjectsOf(json) : null;
      if (!next) {
        const message = (json as { error?: { message?: string } } | null)?.error?.message;
        setError(`변경하지 못했습니다${message ? ` — ${message}` : ''}`);
        return;
      }
      setSubjects(next);
      onChange(next);
    } catch {
      if (alive.current) setError('변경하지 못했습니다 — 네트워크 오류');
    } finally {
      if (alive.current) setSaving(null);
    }
  }

  if (!subjects.length) return error ? <p role="alert" className="px-5 py-2 border-b border-gray-100 text-[11px] text-red-500">{error}</p> : null;

  return (
    <div className="px-5 py-2.5 border-b border-gray-100 bg-white shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-medium text-gray-500">수강 상태</span>
        {subjects.map(({ subject, status }) => (
          <label key={subject} className={`inline-flex items-center gap-1 rounded-full border pl-2 pr-1 py-0.5 text-[11px] font-medium ${TONE[status ?? ''] ?? TONE.inactive}`}>
            {subject}
            <select
              aria-label={`${subject} 수강 상태`}
              value={status ?? ''}
              disabled={saving !== null}
              onChange={(e) => change(subject, status, e.target.value)}
              className="bg-transparent font-semibold outline-none cursor-pointer disabled:cursor-wait"
            >
              {!isSrmStatus(status) && <option value={status ?? ''}>{labelOf(status)}</option>}
              {SRM_STATUSES.map((s) => <option key={s} value={s}>{SRM_STATUS_LABEL[s]}</option>)}
            </select>
            {saving === subject && <Loader2 size={11} className="animate-spin" />}
          </label>
        ))}
      </div>
      {error && <p role="alert" className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
