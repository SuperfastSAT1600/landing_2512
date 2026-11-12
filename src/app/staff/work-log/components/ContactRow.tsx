'use client';

import { useState, type ReactNode } from 'react';
import { reasonLabel } from '@/lib/contact-tasks';
import { kstDate } from '@/lib/kst-date';
import { formatKstDateTime, lastContactLabel } from '../../briefing/format';
import type { ContactLog } from '../../briefing/types';

export interface Chip { key: string; label: string }

interface Props {
  /** 학생 profile id 또는 coach:<key> */
  id: string;
  name: string;
  detail?: string;
  /** 우선순위 표시(예: 최우선) */
  badge?: string;
  /** 해당 용건. 오늘 그 용건으로 기록하면 ✓ 표시 */
  chips: Chip[];
  /** 기록할 때 고르는 용건(list_key). 하나면 고르지 않는다 */
  purposes: string[];
  contacts: ContactLog[];
  staffId: string;
  now: Date;
  onContact: (listKey: string, note: string) => Promise<void>;
  onRemove: (log: ContactLog) => Promise<void>;
  /** 이 대상을 수업 관리 업무에서 삭제(숨김) */
  onDismiss: () => Promise<void>;
  children?: ReactNode;
}

const purposeOf = (log: ContactLog) => (log.listKey ? ` · ${reasonLabel(log.listKey)}` : '');

/** 수업 관리 업무의 한 대상(학생·코치): 용건, 최근 연락, 결과 기록, 이력 */
export function ContactRow({ id, name, detail, badge, chips, purposes, contacts, staffId, now, onContact, onRemove, onDismiss, children }: Props) {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState(purposes[0]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = kstDate(now);
  const doneToday = new Set(contacts.filter(l => l.briefingDate === today).map(l => l.listKey));
  const latest = contacts[0];

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
    <li data-testid={`student-${id}`} className="border-b border-gray-100 px-3 py-2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {badge && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">{badge}</span>}
        <span className="font-medium">{name}</span>
        {detail && <span className="text-xs text-gray-500">{detail}</span>}
        {chips.map(c => (
          <span key={c.key} className={doneToday.has(c.key)
            ? 'rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700'
            : 'rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800'}>
            {doneToday.has(c.key) ? `✓ ${c.label}` : c.label}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">{lastContactLabel(latest?.contactedAt, now)}</span>
          <button type="button" onClick={() => setOpen(true)} className="rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white">결과 기록</button>
          <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600">{open ? '닫기' : `이력 ${contacts.length}`}</button>
          <button type="button" disabled={busy} onClick={() => { if (window.confirm(`${name}을(를) 수업 관리 업무에서 삭제할까요? 삭제한 대상에서 복구할 수 있습니다.`)) void run(onDismiss); }}
            className="text-xs text-red-500 hover:underline disabled:opacity-40">삭제</button>
        </span>
      </div>
      {latest && <p className="mt-1 text-xs text-gray-600">{`최근 연락 ${formatKstDateTime(latest.contactedAt)} ${latest.staffName}${purposeOf(latest)}${latest.note ? ` — ${latest.note}` : ''}`}</p>}
      {children}
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
      {open && (
        <div className="mt-2 space-y-2 rounded bg-gray-50 p-2">
          <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); void run(async () => { await onContact(purpose, note.trim()); setNote(''); }); }}>
            {purposes.length > 1 && (
              <select aria-label="용건" value={purpose} onChange={e => setPurpose(e.target.value)} className="w-full rounded border border-gray-300 px-1 py-1 text-xs sm:w-auto">
                {purposes.map(p => <option key={p} value={p}>{reasonLabel(p)}</option>)}
              </select>
            )}
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="연락 결과 (예: 전화 부재중, 문자로 스케줄 안내)" maxLength={1000}
              className="min-w-0 flex-1 basis-48 rounded border border-gray-300 px-2 py-1 text-xs" />
            <button type="submit" disabled={busy || !note.trim()} className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40">기록</button>
          </form>
          {contacts.length === 0 ? <p className="text-xs text-gray-400">연락 기록이 없습니다.</p> : (
            <ul className="space-y-1">
              {contacts.map(log => (
                <li key={log.id} className="flex flex-wrap items-baseline gap-x-2 text-xs text-gray-700">
                  <span className="tabular-nums text-gray-500">{formatKstDateTime(log.contactedAt)}</span>
                  <span className="font-medium">{log.staffName}</span>
                  {log.listKey && <span className="text-gray-500">[{reasonLabel(log.listKey)}]</span>}
                  {log.note && <span className="text-gray-600">— {log.note}</span>}
                  {log.staffId === staffId && kstDate(new Date(log.contactedAt)) === today && (
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
