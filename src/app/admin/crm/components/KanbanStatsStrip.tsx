'use client';

import { useState, useEffect } from 'react';
import { StatsDetailModal } from './StatsDetailModal';

interface Overview {
  contact_rate: number;
  conversion_rate: number;
  gross_revenue: number; // 환불 전 총 결제
  total_refund: number; // 환불 합(음수)
  total_revenue: number; // 순매출(총매출 − 환불)
  total_net_revenue: number; // 순 수익(환불·부가세 제외 실수익)
}

interface SourceStat {
  source: string;
  leads: number;
  contact_rate: number;
  conversion_rate: number;
}

/**
 * 최초 세일즈(칸반) 탭 상단의 작은 지표 스트립.
 * 정식 정의는 /api/crm/stats 와 동일(이번 달 코호트 기준):
 * - 컨택 성공율: 초기 리드 중 세일즈 콜 예약(2단계) 이상 도달 비율
 * - 결제전환율: 컨택 성공 인원 중 최초결제 비율
 * - 매출: 이번 달 결제 금액 합계 (만원 단위 표기, 정확한 값은 hover)
 */
export function KanbanStatsStrip({
  adminKey,
  onSelectStudent,
}: {
  adminKey: string;
  onSelectStudent?: (id: string) => void;
}) {
  // 이번 달 범위·라벨은 마운트 시 1회 캡처 (render 중 Date 직접 호출 회피)
  const [range] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const pad = (n: number) => String(n).padStart(2, '0');
    const lastDay = new Date(y, m + 1, 0).getDate();
    return {
      from: `${y}-${pad(m + 1)}-01`,
      to: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
      monthLabel: `${m + 1}월`,
    };
  });
  const [data, setData] = useState<Overview | null>(null);
  const [bySource, setBySource] = useState<SourceStat[]>([]);
  const [detailSource, setDetailSource] = useState<string | null>(null);

  useEffect(() => {
    if (!adminKey) return;
    let cancelled = false;
    fetch(`/api/crm/stats?from=${range.from}&to=${range.to}`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return;
        if (j?.data?.overview) setData(j.data.overview as Overview);
        if (Array.isArray(j?.data?.by_source)) setBySource(j.data.by_source as SourceStat[]);
      })
      .catch((err) => console.error('[KanbanStatsStrip] stats fetch failed:', err));
    return () => {
      cancelled = true;
    };
  }, [adminKey, range.from, range.to]);

  if (!data) return null;

  const fmt만원 = (n: number) => `${Math.round(n / 10000).toLocaleString()}만원`;
  const fmt원 = (n: number) => `${n.toLocaleString()}원`;
  const hasRefund = data.total_refund < 0;
  // 목표 미달 시 빨간 글씨로 경고
  const contactColor = data.contact_rate < 70 ? 'text-red-500' : 'text-gray-800';
  const conversionColor = data.conversion_rate < 50 ? 'text-red-500' : 'text-gray-800';

  // 소스별 지표는 리드가 있는 채널만, 리드순(by_source는 이미 정렬됨)
  const sourceRows = bySource.filter((s) => s.leads > 0);

  return (
    <div className="mb-4 space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>
          컨택 성공율 <b className={`${contactColor} font-semibold`}>{data.contact_rate}%</b>
        </span>
        <span className="text-gray-200">·</span>
        <span>
          결제전환율 <b className={`${conversionColor} font-semibold`}>{data.conversion_rate}%</b>
        </span>
        <span className="text-gray-200">·</span>
        <span>
          {range.monthLabel} 매출{' '}
          <b className="text-gray-800 font-semibold" title={fmt원(data.gross_revenue)}>
            {fmt만원(data.gross_revenue)}
          </b>
        </span>
        {hasRefund && (
          <>
            <span className="text-gray-200">·</span>
            <span>
              환불{' '}
              <b className="text-red-500 font-semibold" title={`-${fmt원(-data.total_refund)}`}>
                -{fmt만원(-data.total_refund)}
              </b>
            </span>
          </>
        )}
        <span className="text-gray-200">·</span>
        <span>
          순매출{' '}
          <b className="text-gray-800 font-semibold" title={fmt원(data.total_revenue)}>
            {fmt만원(data.total_revenue)}
          </b>
        </span>
        <span className="text-gray-200">·</span>
        <span>
          순 수익{' '}
          <b className="text-emerald-600 font-semibold" title={fmt원(data.total_net_revenue)}>
            {fmt만원(data.total_net_revenue)}
          </b>
        </span>
      </div>

      {sourceRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-gray-400">
          <span className="text-gray-300">소스별</span>
          {sourceRows.map((s) => (
            <button
              key={s.source}
              type="button"
              onClick={() => setDetailSource(s.source)}
              className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 border border-gray-100 px-2 py-0.5 transition-colors hover:bg-blue-50 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400/40 cursor-pointer"
            >
              <span className="font-medium text-gray-600">{s.source}</span>
              <span className="text-gray-300">({s.leads})</span>
              <span className="text-gray-400">컨택</span>
              <b className="font-semibold text-blue-600">{s.contact_rate}%</b>
              <span className="text-gray-400">전환</span>
              <b className="font-semibold text-emerald-600">{s.conversion_rate}%</b>
            </button>
          ))}
        </div>
      )}

      {detailSource != null && (
        <StatsDetailModal
          adminKey={adminKey}
          metric="leads"
          label={`${detailSource} 리드`}
          source={detailSource}
          onSelectStudent={onSelectStudent}
          from={range.from}
          to={range.to}
          onClose={() => setDetailSource(null)}
        />
      )}
    </div>
  );
}
