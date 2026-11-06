'use client';

import type React from 'react';
import type { RosterCoach } from '@/lib/coach-roster';
import { ROSTER_SUBJECTS, coachForSubject, sortForSubject, type RosterSubject } from '@/lib/coach-roster-subject';
import { CoachCard } from './CoachCard';

type OnOpen = (crmStudentId: string) => void;

function Column({ testId, title, coaches, onOpen, action }: { testId: string; title: string; coaches: RosterCoach[]; onOpen: OnOpen; action?: React.ReactNode }) {
  return (
    <section data-testid={testId} className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <h3 className="flex items-baseline gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-2 text-[13px] font-semibold text-gray-700">
        {title}
        <span className="text-[12px] font-normal text-gray-400"><span data-testid="subject-col-count" className="tabular-nums">{coaches.length}</span>명</span>
        {action}
      </h3>
      {coaches.length
        ? <div className="divide-y divide-gray-100">{coaches.map((c) => <CoachCard key={c.key} coach={c} onOpen={onOpen} />)}</div>
        : <p className="px-4 py-3 text-[12px] text-gray-300">해당 코치 없음</p>}
    </section>
  );
}

/** Coach Management의 가능 과목 기준 — 왼쪽 SAT, 오른쪽 AP(둘 다 가능하면 양쪽, 칸마다 그 과목 학생만·special은 SAT 칸, 칸마다 따로 정한 순서), 과목 없는 코치는 아래(전체 학생) */
export function SubjectColumns({ coaches, onOpen, onEditOrder }: { coaches: RosterCoach[]; onOpen: OnOpen; onEditOrder: (s: RosterSubject) => void }) {
  const none = coaches.filter((c) => !ROSTER_SUBJECTS.some((s) => c.subjects.includes(s)));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        {ROSTER_SUBJECTS.map((s) => (
          <Column
            key={s} testId={`subject-col-${s}`} title={`${s} 가능 코치`} onOpen={onOpen}
            coaches={sortForSubject(coaches.filter((c) => c.subjects.includes(s)), s).map((c) => coachForSubject(c, s))}
            action={<button onClick={() => onEditOrder(s)} aria-label={`${s} 순서 편집`} className="ml-auto rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-normal text-gray-500 hover:bg-gray-50">순서 편집</button>}
          />
        ))}
      </div>
      {none.length > 0 && <Column testId="subject-col-none" title="과목 미지정" coaches={none} onOpen={onOpen} />}
    </div>
  );
}
