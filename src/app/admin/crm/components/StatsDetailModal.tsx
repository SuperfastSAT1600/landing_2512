'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { StatsDetailMetric, StatsDetailResult } from '@/lib/crm-stats-detail';
import { CRM_MEMBER_NAMES } from '@/lib/admin-user';
import { FUNNEL_STAGE_LABELS, type FunnelStage } from '@/types/crm';

const stageLabel = (stage: string) =>
  FUNNEL_STAGE_LABELS[stage as FunnelStage] ?? stage;

interface Props {
  adminKey: string;
  metric: StatsDetailMetric;
  label: string;
  from: string;
  to: string;
  source?: string; // 있으면 해당 유입 소스로 필터(소스 드릴다운)
  onSelectStudent?: (id: string) => void; // 있으면 leads 이름 클릭 시 호출(상세 패널 열기)
  onClose: () => void;
}

const won = (n: number) => `${n.toLocaleString()}원`;
const kstDate = (s: string) =>
  new Date(s).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' });

export function StatsDetailModal({ adminKey, metric, label, from, to, source, onSelectStudent, onClose }: Props) {
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
        const qs = new URLSearchParams({ metric, from, to });
        if (source != null) qs.set('source', source);
        const res = await fetch(`/api/crm/stats/detail?${qs.toString()}`, {
          headers: { 'x-admin-key': adminKey },
        });
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
  }, [metric, from, to, source, adminKey]);

  // 결제 담당자(created_by) 수동 수정 — 과거 결제 보정용
  async function updateCreatedBy(paymentId: string, value: string) {
    const created_by = value || null;
    // 이전 값 저장
    let previous: typeof result = null;
    setResult((prev) => {
      previous = prev;
      return prev && prev.kind === 'payments'
        ? { ...prev, items: prev.items.map((it) => (it.id === paymentId ? { ...it, created_by } : it)) }
        : prev;
    });
    try {
      const res = await fetch(`/api/crm/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ created_by }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      setResult(previous);
    }
  }

  // 결제 유형(최초/재결제) 수동 수정 — 통계가 쓰는 저장값(payment_type) 갱신
  async function updatePaymentType(paymentId: string, payment_type: string) {
    let previous: typeof result = null;
    setResult((prev) => {
      previous = prev;
      return prev && prev.kind === 'payments'
        ? { ...prev, items: prev.items.map((it) => (it.id === paymentId ? { ...it, payment_type } : it)) }
        : prev;
    });
    try {
      const res = await fetch(`/api/crm/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ payment_type }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      setResult(previous);
    }
  }

  // 세금 유형(면세/과세) 수동 수정 — 실수익(net_amount = 과세면 ×0.9) 함께 재계산
  async function updateTaxType(paymentId: string, tax_type: string) {
    let previous: typeof result = null;
    setResult((prev) => {
      previous = prev;
      return prev && prev.kind === 'payments'
        ? {
            ...prev,
            items: prev.items.map((it) =>
              it.id === paymentId
                ? { ...it, tax_type, net_amount: tax_type === '과세' ? Math.round(it.amount * 0.9) : it.amount }
                : it
            ),
          }
        : prev;
    });
    try {
      const res = await fetch(`/api/crm/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ tax_type }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      setResult(previous);
    }
  }

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
                  <th className="text-left py-2 px-3 font-semibold">유입 소스</th>
                  <th className="text-left py-2 px-3 font-semibold">단계</th>
                  <th className="text-left py-2 px-3 font-semibold">상태</th>
                  <th className="text-left py-2 px-3 font-semibold">이탈 사유</th>
                  <th className="text-right py-2 pl-3 font-semibold">문의일</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((it) => (
                  <tr key={it.id} className="border-b border-gray-50">
                    <td className="py-2 pr-3 font-medium">
                      {onSelectStudent ? (
                        <button
                          type="button"
                          onClick={() => { onSelectStudent(it.id); onClose(); }}
                          className="text-blue-700 hover:underline focus:outline-none focus:underline"
                        >
                          {it.name}
                        </button>
                      ) : (
                        <span className="text-gray-800">{it.name}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-600">{it.traffic_source ?? '-'}</td>
                    <td className="py-2 px-3 text-gray-600">{stageLabel(it.funnel_stage)}</td>
                    <td className="py-2 px-3 text-gray-600">{it.lead_status}</td>
                    <td className="py-2 px-3 text-gray-600">{it.churn_tag ?? '-'}</td>
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
                  <th className="text-left py-2 px-3 font-semibold">세금/유형</th>
                  <th className="text-left py-2 pl-3 font-semibold">담당자</th>
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
                    <td className="py-2 px-3 text-gray-500 text-xs whitespace-nowrap">
                      {it.id && it.payment_type !== '환불' ? (
                        <select
                          value={it.tax_type ?? '면세'}
                          onChange={(e) => updateTaxType(it.id as string, e.target.value)}
                          className="text-xs border border-gray-200 rounded-md px-1 py-0.5 focus:outline-none focus:border-blue-400 text-gray-700 cursor-pointer"
                        >
                          <option value="면세">면세</option>
                          <option value="과세">과세</option>
                        </select>
                      ) : (it.tax_type ?? '-')}
                      {' · '}
                      {it.id && it.payment_type !== '환불' ? (
                        <select
                          value={it.payment_type ?? '최초결제'}
                          onChange={(e) => updatePaymentType(it.id as string, e.target.value)}
                          className="text-xs border border-gray-200 rounded-md px-1 py-0.5 focus:outline-none focus:border-blue-400 text-gray-700 cursor-pointer"
                        >
                          <option value="최초결제">최초결제</option>
                          <option value="재결제">재결제</option>
                          {it.payment_type === '원포인트' && <option value="원포인트">원포인트</option>}
                        </select>
                      ) : (it.payment_type ?? '-')}
                    </td>
                    <td className="py-2 pl-3 whitespace-nowrap">
                      {it.id ? (
                        <select
                          value={it.created_by ?? ''}
                          onChange={(e) => updateCreatedBy(it.id as string, e.target.value)}
                          className={`text-xs border rounded-md px-1.5 py-1 focus:outline-none focus:border-blue-400 ${it.created_by ? 'border-gray-200 text-gray-700' : 'border-dashed border-gray-300 text-gray-400'}`}
                        >
                          <option value="">미지정</option>
                          {CRM_MEMBER_NAMES.map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                          {it.created_by && !CRM_MEMBER_NAMES.includes(it.created_by as typeof CRM_MEMBER_NAMES[number]) && (
                            <option value={it.created_by}>{it.created_by}</option>
                          )}
                        </select>
                      ) : (
                        <span className="text-gray-600">{it.created_by ?? '-'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-bold text-gray-900">
                  <td className="py-2 pr-3" colSpan={3}>합계</td>
                  <td className="py-2 px-3 text-right tabular-nums">{won(result.items.reduce((s, it) => s + it.amount, 0))}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{won(result.items.reduce((s, it) => s + it.net_amount, 0))}</td>
                  <td className="py-2 px-3" />
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
