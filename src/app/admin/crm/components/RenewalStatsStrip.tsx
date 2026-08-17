'use client';

// 재결제 보드 요약 — KanbanStatsStrip과 같은 인라인 텍스트 스트립.
// 항상 '현재 보드 스코프' 기준으로만 센다. 예전 박스형 스트립은 역대 전체 전환율을 보여
// 바로 아래 주차별 표와 숫자가 어긋났다.
//
// 스코프에 따라 보여줄 지표가 다르다:
//  - open  : 1~3단계만 존재하므로 전환율·결제 완료는 항상 0 — 표시하지 않는다.
//  - cohort: 그 주차의 5단계 전부 = 전환율의 분모가 성립한다.

import { RENEWAL_OPEN_STAGES, type RenewalStage, type RenewalTarget } from '@/types/crm';

/** 비율 표기 정본 — 소수 1자리, 끝의 0은 버린다. 분모 0이면 '-'. */
export function formatRate(numerator: number, denominator: number): string {
  if (denominator === 0) return '-';
  const pct = Math.round((numerator / denominator) * 1000) / 10;
  return `${pct}%`;
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <span>
      {label}{' '}
      <b data-testid={`renewal-metric-${label}`} className={`font-semibold ${tone ?? 'text-gray-800'}`}>
        {value}
      </b>
    </span>
  );
}

const Sep = () => <span className="text-gray-200">·</span>;

export function RenewalStatsStrip({
  targets,
  scopeLabel,
  mode,
}: {
  targets: RenewalTarget[];
  /** 이 숫자들이 어느 범위인지 — '진행 중 전체' 또는 주차 라벨. */
  scopeLabel: string;
  mode: 'open' | 'cohort';
}) {
  const count = (stage: RenewalStage) => targets.filter((t) => t.stage === stage).length;
  const open = targets.filter((t) => RENEWAL_OPEN_STAGES.includes(t.stage)).length;
  const completed = count('4');

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
      <span className="font-medium text-gray-500">{scopeLabel}</span>
      <Sep />
      {mode === 'cohort' ? (
        <>
          <Metric label="선정" value={targets.length} />
          <Sep />
          <Metric label="진행 중" value={open} tone="text-blue-600" />
          <Sep />
          <Metric label="결제 대기" value={count('3')} tone="text-amber-600" />
          <Sep />
          <Metric label="결제 완료" value={completed} tone="text-emerald-600" />
          <Sep />
          <Metric label="미전환" value={count('5')} tone="text-gray-500" />
          <Sep />
          <Metric label="전환율" value={formatRate(completed, targets.length)} tone="text-gray-900" />
        </>
      ) : (
        <>
          <Metric label="진행 중" value={open} tone="text-blue-600" />
          <Sep />
          <Metric label="최초 컨택 전" value={count('1')} />
          <Sep />
          <Metric label="컨택 중" value={count('2')} />
          <Sep />
          <Metric label="결제 대기" value={count('3')} tone="text-amber-600" />
          <span className="text-[11px] text-gray-300">
            전환율은 아래 주차별 표에서 확인
          </span>
        </>
      )}
    </div>
  );
}
