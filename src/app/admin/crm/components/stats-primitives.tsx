'use client';

// CRM 통계 뷰 공용 프리미티브. SalesStats(B2C 통계)에서 추출 —
// B2B 대시보드/세일즈 로직 통계가 동일 UI를 재사용한다. 순수 표현 컴포넌트.

import type { StageFlowRow } from '@/lib/funnel-stats';

// ─── Period helpers ────────────────────────────────────────────────────────────

export type Preset = 'this_month' | 'last_month' | 'this_quarter' | 'last_6m' | 'all' | 'custom';

// '전체' 하한 — CRM 최초 기록(회사 설립 2024) 이전으로 잡아 모든 데이터를 포함
const ALL_TIME_FROM = '2020-01-01';

export function getPresetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  if (preset === 'this_month') {
    return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
  }
  if (preset === 'last_month') {
    return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) };
  }
  if (preset === 'this_quarter') {
    const qStart = Math.floor(m / 3) * 3;
    return { from: fmt(new Date(y, qStart, 1)), to: fmt(new Date(y, qStart + 3, 0)) };
  }
  if (preset === 'last_6m') {
    return { from: fmt(new Date(y, m - 5, 1)), to: fmt(new Date(y, m + 1, 0)) };
  }
  if (preset === 'all') {
    return { from: ALL_TIME_FROM, to: fmt(new Date(y, m + 1, 0)) };
  }
  return getPresetRange('this_month');
}

export const PRESETS: { key: Preset; label: string }[] = [
  { key: 'this_month', label: '이번 달' },
  { key: 'last_month', label: '지난 달' },
  { key: 'this_quarter', label: '이번 분기' },
  { key: 'last_6m', label: '최근 6개월' },
  { key: 'all', label: '전체' },
  { key: 'custom', label: '직접 입력' },
];

// ─── Display primitives ──────────────────────────────────────────────────────

export function OverviewCard({
  label,
  value,
  sub,
  title,
  onClick,
}: {
  icon?: React.ElementType; // (미니멀 스타일에선 미표시, 하위호환 위해 유지)
  label: string;
  value: string | number;
  sub?: string;
  color?: string; // (미사용, 하위호환)
  title?: string; // 마우스 오버 시 노출할 정확한 값(예: 원 단위 전체 금액)
  onClick?: () => void; // 있으면 클릭 가능 카드(세부 내역 열기)
}) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!(); } } : undefined}
      className={`flex-1 min-w-[130px] py-1 ${
        clickable ? 'cursor-pointer group focus:outline-none' : ''
      }`}
    >
      <p className="text-xs text-gray-400 mb-1.5">{label}</p>
      <p
        title={title}
        className={`text-[26px] leading-none font-semibold text-gray-900 whitespace-nowrap tabular-nums tracking-tight ${
          clickable ? 'group-hover:text-blue-600 transition-colors' : ''
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-gray-400 mt-1.5">{sub}</p>}
    </div>
  );
}

export function RateBar({
  value,
  max = 100,
  color = 'bg-blue-500',
}: {
  value: number;
  max?: number;
  color?: string;
}) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  );
}

// 초 단위 경과 시간을 사람이 읽기 쉬운 한글 기간으로. null이면 '-'.
export function formatDuration(seconds: number | null): string {
  if (seconds == null) return '-';
  if (seconds < 60) return '1분 미만';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}분`;
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  if (hours < 24) return remMin > 0 ? `${hours}시간 ${remMin}분` : `${hours}시간`;
  const days = Math.floor(hours / 24);
  const remHour = hours % 24;
  return remHour > 0 ? `${days}일 ${remHour}시간` : `${days}일`;
}

export function StageFlowTable({ rows }: { rows: StageFlowRow[] }) {
  const fmtDays = (n: number | null) => (n === null ? '-' : `${n.toFixed(1)}일`);
  // 8(수업 중)은 종착 단계라 "다음 단계 이동" 의미가 없어 이동률 비표시
  const lastStage = rows[rows.length - 1]?.stage;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 min-w-[160px]">
              단계
            </th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">도달</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">
              다음 단계 이동
            </th>
            <th className="py-2 px-2 text-xs font-semibold text-gray-500 min-w-[110px]">이동률</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">평균 체류</th>
            <th className="text-right py-2 pl-2 text-xs font-semibold text-gray-500">
              중앙값 체류
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.stage}
              className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
            >
              <td className="py-2.5 pr-4 text-xs font-medium text-gray-800">
                <span className="text-gray-400">{r.stage}.</span> {r.label}
              </td>
              <td className="text-right py-2.5 px-2 text-xs text-gray-700">{r.reached || '-'}</td>
              <td className="text-right py-2.5 px-2 text-xs text-gray-700">
                {r.stage === lastStage ? '-' : r.advanced}
              </td>
              <td className="py-2.5 px-2">
                {r.stage === lastStage || r.reached === 0 ? (
                  <span className="text-xs text-gray-300">-</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700 w-11 text-right">
                      {r.advance_rate}%
                    </span>
                    <RateBar value={r.advance_rate} color="bg-gray-900" />
                  </div>
                )}
              </td>
              <td className="text-right py-2.5 px-2 text-xs text-gray-700">
                {fmtDays(r.avg_days)}
              </td>
              <td className="text-right py-2.5 pl-2 text-xs text-gray-600">
                {fmtDays(r.median_days)}
                {r.sample_size > 0 && (
                  <span className="text-[10px] text-gray-400 ml-1">(n={r.sample_size})</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
