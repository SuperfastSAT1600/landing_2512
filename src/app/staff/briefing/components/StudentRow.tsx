'use client';

import { useState } from 'react';
import { formatKstDateTime, lastContactLabel } from '../format';
import type { ContactLog } from '../types';

interface Props {
  studentId: string;
  name: string;
  /** 이름 옆에 붙는 상태 설명 (예: 잔여 수업 4h) */
  detail?: string;
  isNew?: boolean;
  /** 이 학생의 연락 이력, 최신순 */
  contacts: ContactLog[];
  briefingDate: string;
  now: Date;
  staffId: string;
  onContact: (note?: string) => Promise<void>;
  onRemove: (log: ContactLog) => Promise<void>;
}

export function StudentRow({ studentId, name, detail, isNew, contacts, briefingDate, now, staffId, onContact, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contactedOnDay = contacts.filter(l => l.briefingDate === briefingDate).length;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <li data-testid={`student-${studentId}`} className="border-b border-gray-100 px-3 py-2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">{name}</span>
        {isNew && <span className="rounded bg-blue-100 px-1.5 text-[10px] font-semibold text-blue-700">new</span>}
        {detail && <span className="text-xs text-gray-500">{detail}</span>}
        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">{lastContactLabel(contacts[0]?.contactedAt, now)}</span>
          {contactedOnDay > 0 && <span className="rounded bg-emerald-100 px-1.5 text-[11px] font-semibold text-emerald-700">✓ 연락함 {contactedOnDay}</span>}
          <button type="button" disabled={busy} onClick={() => run(() => onContact())}
            className="rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50">연락함</button>
          <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600">{open ? '닫기' : `이력 ${contacts.length}`}</button>
        </span>
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
      {open && (
        <div className="mt-2 space-y-2 rounded bg-gray-50 p-2">
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void run(async () => { await onContact(note); setNote(''); }); }}>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="메모와 함께 기록 (선택)" maxLength={1000}
              className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs" />
            <button type="submit" disabled={busy || !note.trim()} className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40">기록</button>
          </form>
          {contacts.length === 0 ? <p className="text-xs text-gray-400">연락 기록이 없습니다.</p> : (
            <ul className="space-y-1">
              {contacts.map(log => (
                <li key={log.id} className="flex items-baseline gap-2 text-xs text-gray-700">
                  <span className="tabular-nums text-gray-500">{formatKstDateTime(log.contactedAt)}</span>
                  <span className="font-medium">{log.staffName}</span>
                  {log.note && <span className="text-gray-600">— {log.note}</span>}
                  {log.staffId === staffId && formatKstDateTime(log.contactedAt).slice(0, 5) === formatKstDateTime(now.toISOString()).slice(0, 5) && (
                    <button type="button" onClick={() => run(() => onRemove(log))} className="ml-auto text-[11px] text-red-500 hover:underline">취소</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
