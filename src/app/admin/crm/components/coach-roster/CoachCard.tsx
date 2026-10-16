'use client';

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

// 코치 한 명 — 재원 수(큰 숫자), 온보딩·휴원 수, 명단
export function CoachCard({ coach, onOpen }: { coach: RosterCoach; onOpen: (crmStudentId: string) => void }) {
  return (
    <div data-testid="coach-card" className="flex flex-col rounded-xl border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p data-testid="coach-name" className="truncate text-sm font-semibold text-gray-900">{coach.name}</p>
          <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
            {!coach.registered && <span className="rounded bg-amber-50 px-1 text-amber-700">CRM 미등록</span>}
            {coach.registered && !coach.linked && <span className="rounded bg-gray-100 px-1 text-gray-500">SRM 미연결</span>}
            {coach.onboardingCount > 0 && <span className="text-gray-400">온보딩 {coach.onboardingCount}</span>}
            {coach.pausedCount > 0 && <span className="text-gray-400">휴원 {coach.pausedCount}</span>}
          </div>
        </div>
        <div className="text-right">
          <p data-testid="coach-active" className={`text-2xl font-bold leading-none ${coach.activeCount ? 'text-emerald-600' : 'text-gray-300'}`}>{coach.activeCount}</p>
          <p className="text-[10px] text-gray-400">재원</p>
        </div>
      </div>
      <StudentList students={coach.students} onOpen={onOpen} />
    </div>
  );
}
