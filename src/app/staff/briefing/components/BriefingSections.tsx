'use client';

import type { ReactNode } from 'react';
import { formatHours, formatKstMonthDay, formatMinutesAsHours } from '../format';
import type { BriefingPayload, ContactLog, ContactsByStudent, ListKey } from '../types';
import { CoachCard } from './CoachCard';
import { StudentRow } from './StudentRow';

type ListEntry = BriefingPayload['endingSoon'][number];

export const SECTION_IDS = { endingSoon: 'section-ending-soon', noSchedule: 'section-no-schedule', neverScheduled: 'section-never', coach: 'section-coach' } as const;

interface Shared {
  contacts: ContactsByStudent;
  briefingDate: string;
  now: Date;
  staffId: string;
  onContact: (targetId: string, targetName: string, listKey: ListKey, note?: string) => Promise<void>;
  onRemove: (log: ContactLog) => Promise<void>;
}

const ACCENT = {
  endingSoon: 'border-l-amber-400',
  noSchedule: 'border-l-red-400',
  neverScheduled: 'border-l-slate-400',
  coach: 'border-l-indigo-400',
} as const;

function Section({ id, accent, title, description, count, unit, children }: {
  id: string; accent: keyof typeof ACCENT; title: string; description: string; count: number; unit: string; children: ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-4 overflow-hidden rounded-xl border border-gray-200 border-l-4 bg-white shadow-sm ${ACCENT[accent]}`}>
      <header className="flex items-start gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-sm font-bold tabular-nums text-gray-700 ring-1 ring-gray-200">{count}{unit}</span>
      </header>
      {count === 0 ? <p className="px-4 py-4 text-sm text-gray-400">해당하는 대상이 없습니다.</p> : <ul>{children}</ul>}
    </section>
  );
}

function rowMeta(e: ListEntry, listKey: ListKey): string | undefined {
  if (listKey !== 'endingSoon') return undefined;
  const last = e.lastDate ? ` · 마지막 일정 ${formatKstMonthDay(e.lastDate)}` : '';
  return `남은 일정 스터디홀 ${formatMinutesAsHours(e.studyHallMinutes)} · 보캡 ${formatMinutesAsHours(e.vocabMinutes)}${last}`;
}

function StudentList({ id, accent, title, description, listKey, entries, shared }: {
  id: string; accent: 'endingSoon' | 'noSchedule' | 'neverScheduled'; title: string; description: string; listKey: ListKey; entries: ListEntry[]; shared: Shared;
}) {
  return (
    <Section id={id} accent={accent} title={title} description={description} count={entries.length} unit="명">
      {entries.map(e => (
        <StudentRow key={e.userId} studentId={e.userId} name={e.name} badges={[`잔여 수업 ${formatHours(e.remainingHours)}`]} meta={rowMeta(e, listKey)}
          isNew={listKey === 'neverScheduled' && e.isNew} contacts={shared.contacts[e.userId] ?? []}
          briefingDate={shared.briefingDate} now={shared.now} staffId={shared.staffId}
          onContact={note => shared.onContact(e.userId, e.name, listKey, note)} onRemove={shared.onRemove} />
      ))}
    </Section>
  );
}

export function BriefingSections({ payload, ...shared }: { payload: BriefingPayload } & Shared) {
  return (
    <div className="space-y-5">
      <StudentList id={SECTION_IDS.endingSoon} accent="endingSoon" title="스터디홀/보캡 스케줄 종료 임박" listKey="endingSoon"
        description="마지막 스터디홀/보캡 일정이 이틀 안에 끝나는 학생. 새 일정을 잡도록 연락이 필요합니다." entries={payload.endingSoon} shared={shared} />
      <StudentList id={SECTION_IDS.noSchedule} accent="noSchedule" title="지금 스터디홀/보캡 스케줄 없음" listKey="noSchedule"
        description="예정된 스터디홀/보캡이 하나도 없지만 이전에는 있었던 학생." entries={payload.noSchedule} shared={shared} />
      <StudentList id={SECTION_IDS.neverScheduled} accent="neverScheduled" title="스터디홀/보캡 스케줄이 한 번도 없음" listKey="neverScheduled"
        description="스터디홀/보캡을 한 번도 잡은 적 없는 학생. new 는 코치룸 1회차 수업 전입니다." entries={payload.neverScheduled} shared={shared} />
      <Section id={SECTION_IDS.coach} accent="coach" title="코치별 코치룸 예약 비율" count={payload.coaches.length} unit="명"
        description="코치에게 연락하려면 오른쪽 [연락함], 담당 학생 현황은 코치 이름을 눌러 펼칩니다.">
        {payload.coaches.map(c => (
          <CoachCard key={c.key} coach={c} contacts={shared.contacts} briefingDate={shared.briefingDate} now={shared.now}
            staffId={shared.staffId} onContact={shared.onContact} onRemove={shared.onRemove} />
        ))}
      </Section>
    </div>
  );
}
