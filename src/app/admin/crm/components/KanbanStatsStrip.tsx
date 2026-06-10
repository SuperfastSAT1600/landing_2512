'use client';

import { useState, useEffect } from 'react';

interface Overview {
  contact_rate: number;
  conversion_rate: number;
  gross_revenue: number; // 환불 전 총 결제
  total_refund: number; // 환불 합(음수)
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
 * - 결제전환율: 이번 달 리드 중 최초결제 비율
 * - 매출: 이번 달 결제 금액 합계
 */
export function KanbanStatsStrip({ adminKey }: { adminKey: string }) {
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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [adminKey, range.from, range.to]);

  if (!data) return null;

  const revenueWon = data.gross_revenue.toLocaleString();
  const hasRefund = data.total_refund < 0;
  const refundWon = (-data.total_refund).toLocaleString();
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
          {range.monthLabel} 매출 <b className="text-gray-800 font-semibold">{revenueWon}원</b>
        </span>
        {hasRefund && (
          <>
            <span className="text-gray-200">·</span>
            <span>
              환불 <b className="text-red-500 font-semibold">-{refundWon}원</b>
            </span>
          </>
        )}
      </div>

      {sourceRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-gray-400">
          <span className="text-gray-300">소스별</span>
          {sourceRows.map((s) => (
            <span
              key={s.source}
              className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 border border-gray-100 px-2 py-0.5"
            >
              <span className="font-medium text-gray-600">{s.source}</span>
              <span className="text-gray-300">({s.leads})</span>
              <span className="text-gray-400">컨택</span>
              <b className="font-semibold text-blue-600">{s.contact_rate}%</b>
              <span className="text-gray-400">전환</span>
              <b className="font-semibold text-emerald-600">{s.conversion_rate}%</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
