'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toMonthKey } from '@/lib/crm-stats-core';
import { buildTargetVsActual, USD_TO_KRW_RATE, type MonthlyTargetRow } from '@/lib/business-targets';
import type { GlobalSaleEntry, GlobalSalePaymentType } from '@/app/api/business/global-sales/route';
import { MonthlyTargetEditor } from './MonthlyTargetEditor';

// recharts는 이 패널을 열 때만 필요 — 지연 로딩해 첫 진입 번들에서 제외한다.
const TargetVsActualChart = dynamic(() => import('./TargetVsActualChart'), {
  ssr: false,
  loading: () => <div className="h-[220px] flex items-center justify-center text-sm text-gray-300">차트 로딩…</div>,
});

interface Props {
  adminKey: string;
}

const usd = (n: number) => `$${n.toLocaleString('en-US')}`;
const manwon = (n: number) => `${Math.round(n / 10000).toLocaleString()}만원`;
const won = (n: number) => `${Math.round(n).toLocaleString()}원`;
const today = () => new Date().toISOString().slice(0, 10);

const PAYMENT_BADGE: Record<GlobalSalePaymentType, string> = {
  최초결제: 'bg-emerald-50 text-emerald-600',
  재결제: 'bg-blue-50 text-blue-600',
};

/**
 * 튜터링 CRM(students/payments)과 완전히 분리된 신규 상품 라인의 단순 매출 기록.
 * 아직 정식 CRM 학생이 아니므로 학생 패널 연결 없음. 금액은 USD.
 */
export function GlobalSalesPanel({ adminKey }: Props) {
  const [entries, setEntries] = useState<GlobalSaleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [paymentType, setPaymentType] = useState<GlobalSalePaymentType>('최초결제');
  const [amount, setAmount] = useState('');
  const [saleDate, setSaleDate] = useState(today());
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyTargetRow[]>([]);

  const fetchMonthlyTargets = useCallback(async () => {
    try {
      const res = await fetch('/api/business/monthly-targets?segment=global', {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (res.ok) setMonthlyTargets(json.data ?? []);
    } catch { /* 무시: 목표 비교만 비어 보임 */ }
  }, [adminKey]);

  useEffect(() => { fetchMonthlyTargets(); }, [fetchMonthlyTargets]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/business/global-sales', { headers: { 'x-admin-key': adminKey } });
        const json = await res.json();
        if (res.ok) setEntries(json.data ?? []);
        else setError(json.error ?? '조회에 실패했습니다.');
      } catch {
        setError('네트워크 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [adminKey]);

  async function submit() {
    if (!name.trim() || !amount) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/business/global-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          student_name: name.trim(),
          payment_type: paymentType,
          amount_usd: Number(amount),
          sale_date: saleDate,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setEntries((prev) => [json.data as GlobalSaleEntry, ...prev]);
        setName('');
        setAmount('');
        setPaymentType('최초결제');
        setSaleDate(today());
        setAdding(false);
      } else {
        alert(json.error ?? '기록에 실패했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string, studentName: string) {
    if (!confirm(`"${studentName}" 매출 기록을 삭제할까요?`)) return;
    const prev = entries;
    setEntries((cur) => cur.filter((e) => e.id !== id));
    const res = await fetch(`/api/business/global-sales/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey },
    });
    if (!res.ok) setEntries(prev);
  }

  const total = entries.reduce((sum, e) => sum + e.amount_usd, 0);
  const first = entries.filter((e) => e.payment_type === '최초결제');
  const repeat = entries.filter((e) => e.payment_type === '재결제');
  const sumOf = (list: GlobalSaleEntry[]) => list.reduce((sum, e) => sum + e.amount_usd, 0);

  // 목표(monthlyTargets)는 이미 원화로 저장돼 있다 — 실적(원거래는 USD)만 월별 집계 시점에
  // 1$=1,400원으로 환산해 같은 통화로 맞춘다(그 뒤로는 추가 환산 없음).
  const actualByMonth: Record<string, number> = {};
  for (const e of entries) {
    const key = toMonthKey(e.sale_date);
    actualByMonth[key] = (actualByMonth[key] ?? 0) + e.amount_usd * USD_TO_KRW_RATE;
  }
  const targetVsActual = buildTargetVsActual(monthlyTargets, actualByMonth);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
        <Loader2 size={16} className="animate-spin" /> 불러오는 중…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      {/* 합계 */}
      <div className="flex flex-wrap gap-x-10 gap-y-4 border-b border-gray-100 pb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1">총 매출</p>
          <p data-testid="total-usd" className="text-2xl font-semibold text-gray-900 tabular-nums">{usd(total)}</p>
          <p className="text-[11px] text-gray-400 mt-1">등록 {entries.length}건</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">최초결제</p>
          <p data-testid="first-usd" className="text-2xl font-semibold text-gray-900 tabular-nums">{usd(sumOf(first))}</p>
          <p className="text-[11px] text-gray-400 mt-1">{first.length}건</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">재결제</p>
          <p data-testid="repeat-usd" className="text-2xl font-semibold text-gray-900 tabular-nums">{usd(sumOf(repeat))}</p>
          <p className="text-[11px] text-gray-400 mt-1">{repeat.length}건</p>
        </div>
      </div>

      {/* 월별 목표 대비 실적 — 목표·실적 모두 원화 환산 표시(원거래는 USD) */}
      <div className="border-b border-gray-100 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500">월별 목표 대비 실적</h3>
          <MonthlyTargetEditor segment="global" adminKey={adminKey} onSaved={fetchMonthlyTargets} />
        </div>
        {targetVsActual.length > 0 ? (
          <>
            <TargetVsActualChart data={targetVsActual} formatValue={manwon} formatTooltip={won} />
            <p className="mt-2 text-[11px] text-gray-400">
              1$ = {USD_TO_KRW_RATE.toLocaleString()}원 환산 기준입니다.
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">
            설정된 목표가 없습니다. ‘목표 설정’으로 이번 달부터 등록해보세요.
          </p>
        )}
      </div>

      {/* 추가 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500">매출 목록</h3>
          <button
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus size={13} /> 매출 추가
          </button>
        </div>

        {adding && (
          <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="학생 이름"
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none"
            />
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as GlobalSalePaymentType)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none"
            >
              <option value="최초결제">최초결제</option>
              <option value="재결제">재결제</option>
            </select>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="금액 ($)"
              className="w-24 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none"
            />
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none"
            />
            <button
              onClick={submit}
              disabled={submitting || !name.trim() || !amount}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg"
            >
              추가
            </button>
            <button onClick={() => setAdding(false)} className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700">
              취소
            </button>
          </div>
        )}

        {entries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10 border border-dashed border-gray-200 rounded-lg">
            등록된 매출이 없습니다. ‘매출 추가’로 기록해보세요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400">이름</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">유형</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">금액</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">날짜</th>
                  <th className="py-2 pl-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                    <td className="py-2.5 pr-4 text-xs font-medium text-gray-800">{e.student_name}</td>
                    <td className="py-2.5 px-2">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${PAYMENT_BADGE[e.payment_type]}`}>
                        {e.payment_type}
                      </span>
                    </td>
                    <td className="text-right py-2.5 px-2 text-xs font-medium text-gray-700 tabular-nums">
                      {usd(e.amount_usd)}
                    </td>
                    <td className="text-right py-2.5 px-2 text-xs text-gray-400 tabular-nums">{e.sale_date}</td>
                    <td className="py-2.5 pl-2 text-right">
                      <button
                        onClick={() => remove(e.id, e.student_name)}
                        aria-label="삭제"
                        className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
