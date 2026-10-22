'use client';

import type { ContactLog } from '../types';
import { ContactActions, ContactHistory, useContactRow } from './ContactParts';

interface Props {
  studentId: string;
  name: string;
  /** 이름 옆 칩 (예: 잔여 수업 4h) */
  badges?: string[];
  /** 이름 아래 보조 설명 한 줄 */
  meta?: string;
  isNew?: boolean;
  /** 이 학생의 연락 이력, 최신순 */
  contacts: ContactLog[];
  briefingDate: string;
  now: Date;
  staffId: string;
  onContact: (note?: string) => Promise<void>;
  onRemove: (log: ContactLog) => Promise<void>;
}

export function StudentRow({ studentId, name, badges = [], meta, isNew, contacts, briefingDate, now, staffId, onContact, onRemove }: Props) {
  const row = useContactRow();

  return (
    <li data-testid={`student-${studentId}`} className="border-b border-gray-100 px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900">{name}</span>
            {isNew && <span className="rounded bg-blue-100 px-1.5 text-[10px] font-semibold text-blue-700">new</span>}
            {badges.map(b => <span key={b} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">{b}</span>)}
          </div>
          {meta && <p className="mt-0.5 text-xs text-gray-500">{meta}</p>}
        </div>
        <ContactActions contacts={contacts} briefingDate={briefingDate} now={now} row={row} onContact={onContact} />
      </div>
      <ContactHistory contacts={contacts} now={now} staffId={staffId} row={row} onContact={onContact} onRemove={onRemove} />
    </li>
  );
}
