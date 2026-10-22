'use client';

import { useState } from 'react';
import { coachContactId, formatDelta, formatHours, formatRatio } from '../format';
import type { BriefingPayload, ContactLog, ContactsByStudent, ListKey } from '../types';
import { ContactActions, ContactHistory, useContactRow } from './ContactParts';
import { StudentRow } from './StudentRow';

type Coach = BriefingPayload['coaches'][number];

interface Props {
  coach: Coach;
  contacts: ContactsByStudent;
  briefingDate: string;
  now: Date;
  staffId: string;
  onContact: (targetId: string, targetName: string, listKey: ListKey, note?: string) => Promise<void>;
  onRemove: (log: ContactLog) => Promise<void>;
}

function RatioBar({ ratio }: { ratio: number | null }) {
  if (ratio === null) return null;
  const over = ratio > 100;
  return (
    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-gray-200" aria-hidden>
      <div className={`h-full ${over ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(ratio, 100)}%` }} />
    </div>
  );
}

/** 코치 한 칸: 코치에게 연락(연락함·이력)하고, 이름을 눌러 담당 학생 현황을 펼친다 */
export function CoachCard({ coach, contacts, briefingDate, now, staffId, onContact, onRemove }: Props) {
  const [expanded, setExpanded] = useState(false);
  const row = useContactRow();
  const contactId = coachContactId(coach.key);
  const coachContacts = contacts[contactId] ?? [];
  const contactCoach = (note?: string) => onContact(contactId, coach.name, 'coach', note);

  return (
    <li data-testid={`coach-${coach.key}`} className="border-b border-gray-200 last:border-b-0">
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <button type="button" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}
            className="flex min-w-0 flex-1 items-start gap-2 rounded text-left hover:bg-gray-50">
            <span aria-hidden className={`mt-0.5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{coach.name}</span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                  학생 {coach.studentCount}명 {expanded ? '접기' : '보기'}
                </span>
              </span>
              <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <RatioBar ratio={coach.ratio} />
                <span className="text-sm font-bold tabular-nums">{formatRatio(coach.ratio)}</span>
                <span className="text-xs text-gray-500">예약 {formatHours(coach.scheduledHours)} / 잔여 {formatHours(coach.remainingHours)}</span>
                <span className="text-xs text-gray-500">전일 대비 {formatDelta(coach.deltaPp)}</span>
              </span>
            </span>
          </button>
          <ContactActions contacts={coachContacts} briefingDate={briefingDate} now={now} row={row} onContact={contactCoach} />
        </div>
        <ContactHistory contacts={coachContacts} now={now} staffId={staffId} row={row} onContact={contactCoach} onRemove={onRemove} />
      </div>

      {expanded && (
        <ul className="border-t border-gray-100 bg-gray-50/70 pl-6">
          {coach.students.map(s => (
            <StudentRow key={s.userId} studentId={s.userId} name={s.name}
              meta={`예약 ${formatHours(s.scheduledHours)} / 잔여 ${formatHours(s.remainingHours)} = ${formatRatio(s.ratio)}`}
              contacts={contacts[s.userId] ?? []} briefingDate={briefingDate} now={now} staffId={staffId}
              onContact={note => onContact(s.userId, s.name, 'coach', note)} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </li>
  );
}
