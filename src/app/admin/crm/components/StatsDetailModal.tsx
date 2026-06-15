'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { StatsDetailMetric, StatsDetailResult } from '@/lib/crm-stats-detail';

interface Props {
  adminKey: string;
  metric: StatsDetailMetric;
  label: string;
  from: string;
  to: string;
  onClose: () => void;
}

const won = (n: number) => `${n.toLocaleString()}원`;
const kstDate = (s: string) =>
  new Date(s).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' });

export function StatsDetailModal({ adminKey, metric, label, from, to, onClose }: Props) {
  const [result, setResult] = useState<StatsDetailResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(
          `/api/crm/stats/detail?metric=${metric}&from=${from}&to=${to}`,
          { headers: { 'x-admin-key': adminKey } }
        );
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.data) setResult(json.data as StatsDetailResult);
        else setError(json.error?.message ?? '조회에 실패했습니다.');
      } catch {
        if (!cancelled) setError('네트워크 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [metric, from, to, adminKey]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[80vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">{label} 세부 내역</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {from} ~ {to}
              {result ? ` · 총 ${result.count}건` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors" aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin" /> 불러오는 중…
            </div>
          )}
          {!loading && error && <p className="py-12 text-center text-sm text-red-500">{error}</p>}
          {!loading && !error && result && result.count === 0 && (
            <p className="py-12 text-center text-sm text-gray-400">해당 기간에 데이터가 없습니다.</p>
          )}
          {!loading && !error && result && result.count > 0 && result.kind === 'leads' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="text-left py-2 pr-3 font-semibold">이름</th>
                  <th className="text-left py-2 px-3 font-semibold">유입 채널</th>
                  <th className="text-left py-2 px-3 font-semibold">단계</th>
                  <th className="text-left py-2 px-3 font-semibold">상태</th>
                  <th className="text-right py-2 pl-3 font-semibold">문의일</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((it) => (
                  <tr key={it.id} className="border-b border-gray-50">
                    <td className="py-2 pr-3 text-gray-800 font-medium">{it.name}</td>
                    <td className="py-2 px-3 text-gray-600">{it.traffic_source ?? '-'}</td>
                    <td className="py-2 px-3 text-gray-600">{it.funnel_stage}</td>
                    <td className="py-2 px-3 text-gray-600">{it.lead_status}</td>
                    <td className="py-2 pl-3 text-right text-gray-500 tabular-nums">{it.date ? kstDate(it.date) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !error && result && result.count > 0 && result.kind === 'payments' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="text-left py-2 pr-3 font-semibold">날짜</th>
                  <th className="text-left py-2 px-3 font-semibold">학생</th>
                  <th className="text-left py-2 px-3 font-semibold">상품</th>
                  <th className="text-right py-2 px-3 font-semibold">금액</th>
                  <th className="text-right py-2 px-3 font-semibold">실수익</th>
                  <th className="text-left py-2 pl-3 font-semibold">세금/유형</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((it, i) => (
                  <tr key={`${it.student_name}-${it.paid_at}-${i}`} className="border-b border-gray-50">
                    <td className="py-2 pr-3 text-gray-500 tabular-nums whitespace-nowrap">{kstDate(it.paid_at)}</td>
                    <td className="py-2 px-3 text-gray-800 font-medium whitespace-nowrap">{it.student_name}</td>
                    <td className="py-2 px-3 text-gray-600">{it.product ?? '-'}</td>
                    <td className={`py-2 px-3 text-right tabular-nums whitespace-nowrap ${it.amount < 0 ? 'text-red-500' : 'text-gray-800'}`}>{won(it.amount)}</td>
                    <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap text-gray-500">{won(it.net_amount)}</td>
                    <td className="py-2 pl-3 text-gray-500 text-xs whitespace-nowrap">{it.tax_type ?? '-'} · {it.payment_type ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-bold text-gray-900">
                  <td className="py-2 pr-3" colSpan={3}>합계</td>
                  <td className="py-2 px-3 text-right tabular-nums">{won(result.items.reduce((s, it) => s + it.amount, 0))}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{won(result.items.reduce((s, it) => s + it.net_amount, 0))}</td>
                  <td className="py-2 pl-3" />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
