'use client';

import { useState } from 'react';
import { formatKstDateTime, lastContactLabel } from '../format';
import type { ContactLog } from '../types';

/** 연락 버튼·이력 패널이 공유하는 상태 — 학생 행과 코치 행에서 같이 쓴다 */
export function useContactRow() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  return { open, toggle: () => setOpen(v => !v), busy, error, run };
}

export type ContactRowState = ReturnType<typeof useContactRow>;

interface ActionsProps {
  contacts: ContactLog[];
  briefingDate: string;
  now: Date;
  row: ContactRowState;
  onContact: (note?: string) => Promise<void>;
}

/** 행 오른쪽: 마지막 연락 · [연락함] · [이력] */
export function ContactActions({ contacts, briefingDate, now, row, onContact }: ActionsProps) {
  const contactedOnDay = contacts.filter(l => l.briefingDate === briefingDate).length;
  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{lastContactLabel(contacts[0]?.contactedAt, now)}</span>
        {contactedOnDay > 0 && <span className="rounded bg-emerald-100 px-1.5 text-[11px] font-semibold text-emerald-700">✓ 연락함 {contactedOnDay}</span>}
      </div>
      <div className="flex gap-1.5">
        <button type="button" disabled={row.busy} onClick={() => row.run(() => onContact())}
          className="rounded bg-gray-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">연락함</button>
        <button type="button" aria-expanded={row.open} onClick={row.toggle}
          className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600">{row.open ? '닫기' : `이력 ${contacts.length}`}</button>
      </div>
    </div>
  );
}

interface HistoryProps {
  contacts: ContactLog[];
  now: Date;
  staffId: string;
  row: ContactRowState;
  onContact: (note?: string) => Promise<void>;
  onRemove: (log: ContactLog) => Promise<void>;
}

/** 이력 패널: 메모와 함께 기록 + 전체 이력(최신순) */
export function ContactHistory({ contacts, now, staffId, row, onContact, onRemove }: HistoryProps) {
  const [note, setNote] = useState('');
  const today = formatKstDateTime(now.toISOString()).slice(0, 5);

  return (
    <>
      {row.error && <p role="alert" className="mt-1 text-xs text-red-600">{row.error}</p>}
      {row.open && (
        <div className="mt-2 space-y-2 rounded-md bg-gray-50 p-2.5">
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void row.run(async () => { await onContact(note); setNote(''); }); }}>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="메모와 함께 기록 (선택)" maxLength={1000}
              className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs" />
            <button type="submit" disabled={row.busy || !note.trim()} className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40">기록</button>
          </form>
          {contacts.length === 0 ? <p className="text-xs text-gray-400">연락 기록이 없습니다.</p> : (
            <ul className="space-y-1">
              {contacts.map(log => (
                <li key={log.id} className="flex items-baseline gap-2 text-xs text-gray-700">
                  <span className="tabular-nums text-gray-500">{formatKstDateTime(log.contactedAt)}</span>
                  <span className="font-medium">{log.staffName}</span>
                  {log.note && <span className="text-gray-600">— {log.note}</span>}
                  {log.staffId === staffId && formatKstDateTime(log.contactedAt).slice(0, 5) === today && (
                    <button type="button" onClick={() => row.run(() => onRemove(log))} className="ml-auto text-[11px] text-red-500 hover:underline">취소</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
