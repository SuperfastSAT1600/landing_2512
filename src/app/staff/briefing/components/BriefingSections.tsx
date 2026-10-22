'use client';

import { formatDelta, formatHours, formatKstMonthDay, formatMinutesAsHours, formatRatio } from '../format';
import type { BriefingPayload, ContactLog, ContactsByStudent, ListKey } from '../types';
import { StudentRow } from './StudentRow';

type ListEntry = BriefingPayload['endingSoon'][number];

interface Shared {
  contacts: ContactsByStudent;
  briefingDate: string;
  now: Date;
  staffId: string;
  onContact: (studentId: string, studentName: string, listKey: ListKey, note?: string) => Promise<void>;
  onRemove: (log: ContactLog) => Promise<void>;
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <h2 className="border-b border-gray-200 px-3 py-2 text-sm font-bold">{title} <span className="text-gray-400">{count}명</span></h2>
      {count === 0 ? <p className="px-3 py-3 text-xs text-gray-400">해당 학생이 없습니다.</p> : <ul>{children}</ul>}
    </section>
  );
}

function listDetail(e: ListEntry, listKey: ListKey): string {
  const remaining = `잔여 수업 ${formatHours(e.remainingHours)}`;
  if (listKey !== 'endingSoon') return remaining;
  const last = e.lastDate ? `마지막 ${formatKstMonthDay(e.lastDate)}` : '';
  return `(${formatMinutesAsHours(e.studyHallMinutes)}/${formatMinutesAsHours(e.vocabMinutes)}) ${last} · ${remaining}`;
}

function StudentList({ title, listKey, entries, shared }: { title: string; listKey: ListKey; entries: ListEntry[]; shared: Shared }) {
  return (
    <Section title={title} count={entries.length}>
      {entries.map(e => (
        <StudentRow key={e.userId} studentId={e.userId} name={e.name} detail={listDetail(e, listKey)}
          isNew={listKey === 'neverScheduled' && e.isNew} contacts={shared.contacts[e.userId] ?? []}
          briefingDate={shared.briefingDate} now={shared.now} staffId={shared.staffId}
          onContact={note => shared.onContact(e.userId, e.name, listKey, note)} onRemove={shared.onRemove} />
      ))}
    </Section>
  );
}

function CoachSection({ coaches, shared }: { coaches: BriefingPayload['coaches']; shared: Shared }) {
  return (
    <Section title="코치별 코치룸 예약 비율" count={coaches.length}>
      {coaches.map(c => (
        <li key={c.key} className="border-b border-gray-100 last:border-b-0">
          <details>
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 px-3 py-2 text-sm">
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-gray-500">{c.studentCount}명 · 예약 {formatHours(c.scheduledHours)} / 잔여 {formatHours(c.remainingHours)}</span>
              <span className="ml-auto text-sm font-bold tabular-nums">{formatRatio(c.ratio)}</span>
              <span className="text-xs text-gray-500">전일 대비 {formatDelta(c.deltaPp)}</span>
            </summary>
            <ul className="bg-gray-50/60 pl-4">
              {c.students.map(s => (
                <StudentRow key={s.userId} studentId={s.userId} name={s.name}
                  detail={`예약 ${formatHours(s.scheduledHours)} / 잔여 ${formatHours(s.remainingHours)} = ${formatRatio(s.ratio)}`}
                  contacts={shared.contacts[s.userId] ?? []} briefingDate={shared.briefingDate} now={shared.now} staffId={shared.staffId}
                  onContact={note => shared.onContact(s.userId, s.name, 'coach', note)} onRemove={shared.onRemove} />
              ))}
            </ul>
          </details>
        </li>
      ))}
    </Section>
  );
}

export function BriefingSections({ payload, ...shared }: { payload: BriefingPayload } & Shared) {
  return (
    <div className="space-y-4">
      <StudentList title="스터디홀/보캡 스케줄 종료 임박" listKey="endingSoon" entries={payload.endingSoon} shared={shared} />
      <StudentList title="지금 스터디홀/보캡 스케줄 없음" listKey="noSchedule" entries={payload.noSchedule} shared={shared} />
      <StudentList title="스터디홀/보캡 스케줄이 한 번도 없음" listKey="neverScheduled" entries={payload.neverScheduled} shared={shared} />
      <CoachSection coaches={payload.coaches} shared={shared} />
    </div>
  );
}
