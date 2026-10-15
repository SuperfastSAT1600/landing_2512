'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CoachLessonStatus, CoachSubjectLedger } from '@/lib/coach-room-ledger';

const MGMT_LABEL: Record<string, string> = { onboarding: '온보딩', active: '수업 중', paused: '휴원', inactive: '종료', excluded: '제외' };

const h = (n: number) => `${Math.round(n * 10) / 10}h`;

const STATUS_STYLE: Record<CoachLessonStatus, { label: string; cls: string }> = {
  completed: { label: '완료', cls: 'bg-blue-50 text-blue-700' },
  scheduled: { label: '예정', cls: 'bg-emerald-50 text-emerald-700' },
  pending: { label: '확인 대기', cls: 'bg-amber-50 text-amber-700' },
};

// KST 기준 "10.13 (화) 05:00–07:00"
function kstRange(startIso: string, endIso: string): string {
  const part = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', ...o }).format(new Date(iso));
  const date = part(startIso, { month: '2-digit', day: '2-digit' }).replace(/\s/g, '').replace(/\.$/, '');
  const wd = part(startIso, { weekday: 'short' });
  const t = (iso: string) => part(iso, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${date} (${wd}) ${t(startIso)}–${t(endIso)}`;
}
const kstDay = (iso: string | null) => (iso ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)) : '-');

function Stat({ label, value, testId, tone = 'text-gray-900' }: { label: string; value: string; testId: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 px-2 py-1.5">
      <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
      <p data-testid={testId} className={`text-sm font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

export function CoachRoomSubject({ ledger }: { ledger: CoachSubjectLedger }) {
  const [showPayments, setShowPayments] = useState(false);
  const t = ledger.totals;
  const registered = Math.round((t.purchased - t.refunded) * 10) / 10;
  const pct = registered > 0 ? Math.min(100, Math.round((t.completed / registered) * 100)) : 0;
  const over = t.remaining < 0;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-800">{ledger.subject}</span>
        {ledger.managementStatus && <span className="text-[10px] text-gray-400">{MGMT_LABEL[ledger.managementStatus] ?? ledger.managementStatus}</span>}
        {t.refunded > 0 && <span className="ml-auto text-[10px] text-gray-400">환불 {h(t.refunded)}</span>}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <Stat label="등록" value={h(registered)} testId="coach-registered" />
        <Stat label="진행" value={h(t.completed)} testId="coach-completed" tone="text-blue-700" />
        <Stat label="잔여" value={h(t.remaining)} testId="coach-remaining" tone={over ? 'text-red-600' : 'text-gray-900'} />
        <Stat label="예약" value={h(t.scheduled)} testId="coach-scheduled" tone="text-emerald-700" />
      </div>

      <div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full ${over ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${over ? 100 : pct}%` }} />
        </div>
        <p className="mt-1 text-[10px] text-gray-400">
          {over
            ? <span className="text-red-600 font-semibold">초과 진행 {h(-t.remaining)} — 결제분보다 많이 수업함</span>
            : <>진행 {pct}% · 예약 안 된 잔여 {h(Math.max(0, t.unscheduled))}{t.unscheduled < 0 && ` · 초과 예약 ${h(-t.unscheduled)}`}</>}
        </p>
      </div>

      {ledger.lessons.length > 0 ? (
        <ul className="divide-y divide-gray-50">
          {ledger.lessons.map((l) => (
            <li key={l.id} className="flex items-center gap-2 py-1.5 text-[11px]">
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[l.status].cls}`}>{STATUS_STYLE[l.status].label}</span>
              <span className="tabular-nums text-gray-700">{kstRange(l.startsAt, l.endsAt)}</span>
              <span className="tabular-nums text-gray-500">{h(l.hours)}</span>
              <span className="truncate text-gray-400">{l.teacher ?? ''}</span>
              {l.cumulativeCompleted != null && (
                <span className="ml-auto shrink-0 tabular-nums text-blue-600 font-medium">누적 {h(l.cumulativeCompleted)}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-gray-400">아직 잡힌 수업이 없습니다.</p>
      )}

      <button onClick={() => setShowPayments((v) => !v)} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800">
        <ChevronDown size={12} className={`transition-transform ${showPayments ? 'rotate-180' : ''}`} />
        결제 내역 {ledger.transactions.length}건
      </button>
      {showPayments && (
        <ul className="space-y-1 text-[11px]">
          {ledger.transactions.map((p, i) => (
            <li key={i} className="flex gap-2"><span className="tabular-nums text-gray-400 shrink-0">{kstDay(p.paidAt)}</span><span className="flex-1 truncate text-gray-600">{p.product ?? '-'}</span><span className="tabular-nums font-semibold text-gray-800">+{h(p.hours)}</span></li>
          ))}
          {ledger.refunds.map((r, i) => (
            <li key={`r${i}`} className="flex gap-2"><span className="tabular-nums text-gray-400 shrink-0">{kstDay(r.refundedAt)}</span><span className="flex-1 truncate text-gray-600">환불 · {r.reason ?? ''}</span><span className="tabular-nums font-semibold text-red-600">−{h(r.hours)}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
