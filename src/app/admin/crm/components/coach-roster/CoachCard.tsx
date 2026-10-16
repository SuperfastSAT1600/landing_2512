'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { SRM_STATUS_LABEL } from '@/lib/srm-status';
import type { RosterCoach, RosterStudent } from '@/lib/coach-roster';

const STATUS_TONE: Record<RosterStudent['status'], string> = {
  active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  onboarding: 'text-gray-500 bg-gray-50 border-gray-200',
  paused: 'text-gray-500 bg-gray-50 border-gray-200',
};

function StudentLine({ student, onOpen }: { student: RosterStudent; onOpen: (crmStudentId: string) => void }) {
  const dim = student.status !== 'active';
  const chips = student.subjects.length ? student.subjects : [{ subject: '', status: student.status }];
  const body = (
    <>
      <span className={`truncate ${dim ? 'text-gray-400' : 'text-gray-800'}`}>{student.name}</span>
      <span className="ml-auto flex shrink-0 gap-1">
        {chips.map((s) => (
          <span key={s.subject} className={`rounded-full border px-1.5 text-[10px] font-medium ${STATUS_TONE[s.status]}`}>
            {s.subject && `${s.subject} `}{SRM_STATUS_LABEL[s.status]}
          </span>
        ))}
      </span>
    </>
  );
  if (!student.crmStudentId) {
    return <li title="CRM 미연결 — SRM 이름" className="flex items-center gap-2 px-2 py-1 text-[12px] italic">{body}</li>;
  }
  const id = student.crmStudentId;
  return (
    <li>
      <button onClick={() => onOpen(id)} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] hover:bg-blue-50">
        {body}
      </button>
    </li>
  );
}

export function StudentList({ students, onOpen }: { students: RosterStudent[]; onOpen: (crmStudentId: string) => void }) {
  if (!students.length) return <p className="px-2 py-1 text-[12px] text-gray-300">수업 중인 학생 없음</p>;
  return <ul className="space-y-0.5">{students.map((s) => <StudentLine key={s.profileId} student={s} onOpen={onOpen} />)}</ul>;
}

/** 접히는 한 줄 — 헤더(이름 · 담당 수)를 누르면 학생 명단을 펼친다 */
export function RosterRow({ label, count, hint, tone = 'default', testId, countTestId, children }: {
  label: ReactNode; count: number; hint?: ReactNode; tone?: 'default' | 'amber'; testId: string; countTestId: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const amber = tone === 'amber';
  return (
    <div data-testid={testId} className={amber ? 'bg-amber-50/40' : ''}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left ${amber ? 'hover:bg-amber-50' : 'hover:bg-gray-50'}`}
      >
        <ChevronRight size={14} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className="flex min-w-0 items-center gap-2">{label}</span>
        <span className="shrink-0 text-[12px] text-gray-400">
          <span data-testid={countTestId} className={`text-sm font-bold tabular-nums ${count ? (amber ? 'text-amber-700' : 'text-emerald-600') : 'text-gray-300'}`}>{count}</span>명
        </span>
        {hint}
      </button>
      {open && <div id={panelId} className="px-4 pb-3 pl-9">{children}</div>}
    </div>
  );
}

// 코치 한 명 — 줄에는 이름과 담당(재원) 학생 수, 펼치면 명단
export function CoachCard({ coach, onOpen }: { coach: RosterCoach; onOpen: (crmStudentId: string) => void }) {
  const label = (
    <>
      <span data-testid="coach-name" className="truncate text-sm font-semibold text-gray-900">{coach.name}</span>
      {!coach.registered && <span className="shrink-0 rounded bg-amber-50 px-1 text-[10px] text-amber-700">CRM 미등록</span>}
      {coach.registered && !coach.linked && <span className="shrink-0 rounded bg-gray-100 px-1 text-[10px] text-gray-500">SRM 미연결</span>}
    </>
  );
  return (
    <RosterRow testId="coach-card" countTestId="coach-active" label={label} count={coach.activeCount}>
      <StudentList students={coach.students} onOpen={onOpen} />
    </RosterRow>
  );
}
