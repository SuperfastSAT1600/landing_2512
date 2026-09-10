'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import {
  WEEKLY_PLAN_METRIC_LABELS,
  type WeeklyPlanMetricKey,
  type WeeklyPlanSegment,
} from '@/types/crm';
import type { LeadDetailItem } from '@/lib/crm-stats-detail';
import { SEGMENT_LABELS } from './presets';
import { shortDay } from './format';

/**
 * 이 띠는 '이번 주 인입 리드 코호트'만 보여준다 — 신규 리드가 컨택·전환으로 얼마나 갔는지.
 *
 * 매출·실수익(`revenue`, `net_revenue`)은 일부러 뺐다. 그 둘은 payments.paid_at 기준
 * "이번 주 입금액"이라 최초결제·재결제를 모두 포함하는 현금 기준이고, 옆의 `paid`는
 * "이번 주 인입 리드 중 최초결제한 사람"이라는 코호트 기준이다. 축이 다른 두 숫자를
 * 나란히 놓으면 "결제 0인데 매출 1,484만"처럼 읽혀 오해를 만든다.
 * 트랙 목표의 `매출` 지표는 그 트랙 리드의 최초결제만 세므로 이와 무관하게 유효하다.
 */
const STRIP_METRICS: WeeklyPlanMetricKey[] = ['leads', 'contacted', 'paid'];

interface Row {
  segment: WeeklyPlanSegment;
  actuals: Partial<Record<WeeklyPlanMetricKey, number>>;
}

interface Props {
  rows: Row[];
  adminKey: string;
  week: { start: string; end: string };
  showSegmentLabel?: boolean;
  onSelectStudent?: (id: string) => void;
}

type OpenKey = `${WeeklyPlanSegment}:${WeeklyPlanMetricKey}`;

/** 이번 주 인입 리드 코호트 — 읽기 전용. 지표를 누르면 그 숫자의 리드 명단이 펼쳐진다. */
export function WeeklyKpiStrip({ rows, adminKey, week, showSegmentLabel, onSelectStudent }: Props) {
  const [open, setOpen] = useState<OpenKey | null>(null);

  return (
    <section className="border-b border-gray-100 pb-4">
      <p className="text-xs font-semibold text-gray-400 mb-2">이번 주 인입 리드</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.segment}>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
              {showSegmentLabel && (
                <span className="text-[10px] font-semibold text-gray-400 w-8 shrink-0">
                  {SEGMENT_LABELS[row.segment]}
                </span>
              )}
              {STRIP_METRICS.map((key) => {
                const value = row.actuals[key] ?? 0;
                const openKey: OpenKey = `${row.segment}:${key}`;
                const isOpen = open === openKey;
                const label = WEEKLY_PLAN_METRIC_LABELS[key];
                return (
                  <button
                    key={key}
                    disabled={value === 0}
                    aria-label={`${label} ${value}`}
                    aria-expanded={value === 0 ? undefined : isOpen}
                    onClick={() => setOpen(isOpen ? null : openKey)}
                    className={`flex items-baseline gap-1.5 rounded px-1 -mx-1 transition-colors ${
                      value === 0
                        ? 'cursor-default'
                        : isOpen
                          ? 'bg-blue-50'
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-[11px] text-gray-400">{label}</span>
                    <span className="text-base font-semibold text-gray-900 tabular-nums">{value}</span>
                    {value > 0 &&
                      (isOpen ? (
                        <ChevronDown size={11} className="text-gray-400 self-center" />
                      ) : (
                        <ChevronRight size={11} className="text-gray-300 self-center" />
                      ))}
                  </button>
                );
              })}
            </div>

            {open?.startsWith(`${row.segment}:`) && (
              <LeadAccordion
                key={open}
                metric={open.split(':')[1] as WeeklyPlanMetricKey}
                segment={row.segment}
                adminKey={adminKey}
                week={week}
                onSelectStudent={onSelectStudent}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

interface AccordionProps {
  metric: WeeklyPlanMetricKey;
  segment: WeeklyPlanSegment;
  adminKey: string;
  week: { start: string; end: string };
  onSelectStudent?: (id: string) => void;
}

/** 지표 숫자의 근거 명단. /api/crm/stats/detail 이 overview와 같은 코호트를 쓴다. */
function LeadAccordion({ metric, segment, adminKey, week, onSelectStudent }: AccordionProps) {
  const [items, setItems] = useState<LeadDetailItem[] | null>(null);
  const [error, setError] = useState('');

  // 지표를 바꾸면 호출자가 key로 리마운트하므로 여기서 상태를 되돌릴 필요가 없다.
  useEffect(() => {
    let alive = true;
    fetch(
      `/api/crm/stats/detail?metric=${metric}&segment=${segment}&from=${week.start}&to=${week.end}`,
      { headers: { 'x-admin-key': adminKey } },
    )
      .then(async (res) => {
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || !json.data) { setError('명단을 불러오지 못했습니다.'); return; }
        setItems((json.data.items ?? []) as LeadDetailItem[]);
      })
      .catch(() => { if (alive) setError('명단을 불러오지 못했습니다.'); });
    return () => { alive = false; };
  }, [metric, segment, adminKey, week.start, week.end]);

  return (
    <div className="mt-1.5 rounded-lg border border-gray-200 bg-gray-50/60 px-2.5 py-2">
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {!error && items === null && (
        <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Loader2 size={11} className="animate-spin" /> 불러오는 중…
        </p>
      )}
      {items?.length === 0 && <p className="text-[11px] text-gray-400">해당하는 리드가 없습니다.</p>}
      {items && items.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {items.map((l) => (
            <button
              key={l.id}
              onClick={() => onSelectStudent?.(l.id)}
              title={[l.traffic_source ?? '유입경로 미입력', l.churn_tag].filter(Boolean).join(' · ')}
              className={`text-[11px] px-1.5 py-0.5 rounded border bg-white transition-colors ${
                l.is_paid
                  ? 'border-emerald-200 text-emerald-700 hover:border-emerald-400'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {l.name}
              {l.date && <span className="ml-1 text-[10px] text-gray-400">{shortDay(l.date)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
