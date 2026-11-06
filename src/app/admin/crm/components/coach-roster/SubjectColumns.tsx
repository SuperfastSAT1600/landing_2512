'use client';

import type { RosterCoach } from '@/lib/coach-roster';
import { coachForSubject } from '@/lib/coach-roster-subject';
import { CoachCard } from './CoachCard';

const SUBJECTS = ['SAT', 'AP'] as const;

type OnOpen = (crmStudentId: string) => void;

function Column({ testId, title, coaches, onOpen }: { testId: string; title: string; coaches: RosterCoach[]; onOpen: OnOpen }) {
  return (
    <section data-testid={testId} className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <h3 className="flex items-baseline gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-2 text-[13px] font-semibold text-gray-700">
        {title}
        <span className="text-[12px] font-normal text-gray-400"><span data-testid="subject-col-count" className="tabular-nums">{coaches.length}</span>명</span>
      </h3>
      {coaches.length
        ? <div className="divide-y divide-gray-100">{coaches.map((c) => <CoachCard key={c.key} coach={c} onOpen={onOpen} />)}</div>
        : <p className="px-4 py-3 text-[12px] text-gray-300">해당 코치 없음</p>}
    </section>
  );
}

/** Coach Management의 가능 과목 기준 — 왼쪽 SAT, 오른쪽 AP(둘 다 가능하면 양쪽, 칸마다 그 과목 학생만), 과목 없는 코치는 아래(전체 학생) */
export function SubjectColumns({ coaches, onOpen }: { coaches: RosterCoach[]; onOpen: OnOpen }) {
  const none = coaches.filter((c) => !SUBJECTS.some((s) => c.subjects.includes(s)));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        {SUBJECTS.map((s) => (
          <Column key={s} testId={`subject-col-${s}`} title={`${s} 가능 코치`} coaches={coaches.filter((c) => c.subjects.includes(s)).map((c) => coachForSubject(c, s))} onOpen={onOpen} />
        ))}
      </div>
      {none.length > 0 && <Column testId="subject-col-none" title="과목 미지정" coaches={none} onOpen={onOpen} />}
    </div>
  );
}
