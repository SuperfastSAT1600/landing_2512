'use client';

import { useState, useEffect } from 'react';

interface Overview {
  contact_rate: number;
  conversion_rate: number;
  total_revenue: number;
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

  useEffect(() => {
    if (!adminKey) return;
    let cancelled = false;
    fetch(`/api/crm/stats?from=${range.from}&to=${range.to}`, { headers: { 'x-admin-key': adminKey } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.data?.overview) setData(j.data.overview as Overview);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [adminKey, range.from, range.to]);

  if (!data) return null;

  const revenueMan = Math.round(data.total_revenue / 10000).toLocaleString();
  // 목표 미달 시 빨간 글씨로 경고
  const contactColor = data.contact_rate < 70 ? 'text-red-500' : 'text-gray-800';
  const conversionColor = data.conversion_rate < 50 ? 'text-red-500' : 'text-gray-800';

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
      <span>
        컨택 성공율 <b className={`${contactColor} font-semibold`}>{data.contact_rate}%</b>
      </span>
      <span className="text-gray-200">·</span>
      <span>
        결제전환율 <b className={`${conversionColor} font-semibold`}>{data.conversion_rate}%</b>
      </span>
      <span className="text-gray-200">·</span>
      <span>
        {range.monthLabel} 매출 <b className="text-gray-800 font-semibold">{revenueMan}만원</b>
      </span>
    </div>
  );
}
