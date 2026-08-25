'use client';

// 재결제 후보 표 — 플랫폼 Payment 페이지(app.superfastsat.io/admin/payment)와 같은 수치 컬럼을
// CRM 안으로 옮긴 것. 담당자가 그 페이지에서 잔여 시간을 보고 대상을 고르던 동작을
// 탭 이동 없이 여기서 끝낼 수 있어야 한다 → 정렬 가능한 표 + 행마다 즉시 추가 버튼.

import { useCallback, useMemo, useState } from 'react';
import { Crown, AlertTriangle, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import {
  TUTORING_STATUS_META,
  type TutoringEntry,
  type TutoringHours,
  type TutoringRowStudent,
} from './TutoringStudentRow';

type MetricKey = keyof TutoringHours;
type SortKey = MetricKey | 'name';

interface Column<K extends SortKey = SortKey> {
  key: K;
  label: string;
  /** 큰 값이 급한 지표는 내림차순으로 먼저 정렬한다. */
  descFirst: boolean;
  hint: string;
}

const METRIC_COLUMNS: Column<MetricKey>[] = [
  { key: 'purchased', label: '구매', descFirst: true, hint: '결제한 총 시간' },
  { key: 'completed', label: '완료', descFirst: true, hint: '진행 완료한 수업 시간' },
  { key: 'refunded', label: '환불', descFirst: true, hint: '환불된 시간' },
  { key: 'remaining', label: '잔여', descFirst: false, hint: '구매 − 환불 − 완료. 음수면 결제분을 넘겨 수업한 상태' },
  { key: 'scheduled', label: '예약', descFirst: true, hint: '캘린더에 잡혀 있는 미진행 수업 시간' },
  { key: 'unscheduled', label: '미예약', descFirst: true, hint: '결제했지만 아직 캘린더에 없는 시간' },
  { key: 'overscheduled', label: '초과예약', descFirst: true, hint: '결제분을 넘겨 예약된 시간 — 가장 급한 신호' },
];

const PAYMENT_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  onboarding: { label: 'Onboarding', className: 'bg-sky-100 text-sky-700' },
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700' },
  paused: { label: 'Paused', className: 'bg-amber-100 text-amber-700' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-500' },
  excluded: { label: 'Excluded', className: 'bg-gray-100 text-gray-400' },
};

/**
 * Payment 페이지 표기 규칙을 그대로 따른다:
 * 구매·완료·잔여·예약은 0도 숫자로 (0 자체가 정보), 환불·미예약·초과예약은 0이면 '—'.
 */
const ALWAYS_NUMERIC: MetricKey[] = ['purchased', 'completed', 'remaining', 'scheduled'];

function num(key: MetricKey, value: number): string {
  if (value === 0 && !ALWAYS_NUMERIC.includes(key)) return '—';
  return String(value);
}

function metricTone(key: MetricKey, value: number): string {
  if (key === 'remaining') {
    if (value < 0) return 'text-red-600 font-bold';
    if (value === 0) return 'text-red-500 font-semibold';
    if (value <= 5) return 'text-amber-600 font-semibold';
    return 'text-gray-700';
  }
  if (key === 'overscheduled' && value > 0) return 'text-orange-600 font-bold';
  if (key === 'unscheduled' && value > 0) return 'text-amber-600 font-medium';
  if (key === 'refunded' && value > 0) return 'text-gray-500';
  return 'text-gray-700';
}

type SortState = { key: SortKey; desc: boolean } | null;

function SortHeader({
  col,
  align,
  sort,
  onToggle,
}: {
  col: Column;
  align: 'left' | 'right';
  sort: SortState;
  onToggle: (col: Column) => void;
}) {
  const active = sort?.key === col.key;
  return (
    <th
      scope="col"
      className={`py-2 px-2 ${align === 'right' ? 'text-right' : 'text-left'} whitespace-nowrap`}
    >
      <button
        type="button"
        onClick={() => onToggle(col)}
        title={col.hint}
        className={`inline-flex items-center gap-0.5 text-xs font-semibold transition-colors ${
          active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        {col.label}
        {active ? (
          sort!.desc ? <ChevronDown size={11} /> : <ChevronUp size={11} />
        ) : (
          <span className="w-[11px]" />
        )}
      </button>
    </th>
  );
}

const NAME_COLUMN: Column<'name'> = { key: 'name', label: '학생', descFirst: false, hint: '이름순' };

interface Props {
  entries: TutoringEntry<TutoringRowStudent>[];
  onAdd: (studentId: string) => void;
  pendingStudentId: string | null;
  onSelectStudent?: (studentId: string) => void;
}

export function RenewalCandidateTable({ entries, onAdd, pendingStudentId, onSelectStudent }: Props) {
  // 기본 정렬 = 급한 순 (초과예약 desc → 잔여 asc). sort가 null이면 이 순서를 쓴다.
  const [sort, setSort] = useState<SortState>(null);

  const rows = useMemo(() => {
    const list = entries.slice();
    if (!sort) {
      return list.sort((a, b) => {
        const over = (b.hours?.overscheduled ?? 0) - (a.hours?.overscheduled ?? 0);
        if (over !== 0) return over;
        const ah = a.hours ? a.hours.remaining : Number.POSITIVE_INFINITY;
        const bh = b.hours ? b.hours.remaining : Number.POSITIVE_INFINITY;
        if (ah !== bh) return ah - bh;
        return a.student.name.localeCompare(b.student.name);
      });
    }
    if (sort.key === 'name') {
      return list.sort((a, b) =>
        sort.desc
          ? b.student.name.localeCompare(a.student.name)
          : a.student.name.localeCompare(b.student.name)
      );
    }
    const key: MetricKey = sort.key;
    return list.sort((a, b) => {
      // SRM 미연결(수치 없음)은 방향과 무관하게 항상 뒤로.
      if (!a.hours && !b.hours) return a.student.name.localeCompare(b.student.name);
      if (!a.hours) return 1;
      if (!b.hours) return -1;
      const diff = a.hours[key] - b.hours[key];
      if (diff !== 0) return sort.desc ? -diff : diff;
      return a.student.name.localeCompare(b.student.name);
    });
  }, [entries, sort]);

  const toggleSort = useCallback((col: Column) => {
    setSort((current) =>
      current?.key === col.key
        ? { key: col.key, desc: !current.desc }
        : { key: col.key, desc: col.descFirst }
    );
  }, []);

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full min-w-[860px]">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200">
            <SortHeader col={NAME_COLUMN} align="left" sort={sort} onToggle={toggleSort} />
            <th scope="col" className="py-2 px-2 text-left text-xs font-semibold text-gray-500">상태</th>
            {METRIC_COLUMNS.map((col) => (
              <SortHeader key={col.key} col={col} align="right" sort={sort} onToggle={toggleSort} />
            ))}
            <th scope="col" className="py-2 px-2 w-20" />
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => {
            const { student, hours, displayStatus, subjects, paymentStatus } = entry;
            const meta = TUTORING_STATUS_META[displayStatus];
            const payMeta = paymentStatus ? PAYMENT_STATUS_LABEL[paymentStatus] : null;
            // 결제분 초과 사용/예약 → Payment 페이지처럼 행 전체를 옅은 빨강으로.
            const urgent = (hours?.remaining ?? 1) < 0 || (hours?.overscheduled ?? 0) > 0;

            return (
              <tr
                key={student.id}
                className={`border-b border-gray-50 transition-colors ${urgent ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-gray-50'}`}
              >
                <td className="py-2 px-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      data-testid={`cell-name-${student.id}`}
                      onClick={() => onSelectStudent?.(student.id)}
                      className={`text-xs font-semibold text-gray-900 ${onSelectStudent ? 'hover:text-blue-600 hover:underline' : 'cursor-default'}`}
                    >
                      {student.name}
                    </button>
                    {student.grade && <span className="text-[10px] text-gray-400">{student.grade}</span>}
                    {student.is_vip && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded font-semibold bg-amber-100 text-amber-700">
                        <Crown size={8} />VIP
                      </span>
                    )}
                    {student.needs_attention && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded font-semibold bg-red-100 text-red-700">
                        <AlertTriangle size={8} />주의
                      </span>
                    )}
                    {subjects.map((s) => (
                      <span key={s} className="text-[10px] px-1 py-0.5 rounded font-semibold bg-gray-100 text-gray-600">
                        {s}
                      </span>
                    ))}
                  </div>
                  {student.parent_phone && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{student.parent_phone}</p>
                  )}
                </td>

                <td className="py-2 px-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold ${meta.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                      {meta.label}
                    </span>
                    {payMeta && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${payMeta.className}`}>
                        {payMeta.label}
                      </span>
                    )}
                  </div>
                </td>

                {METRIC_COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    data-testid={`cell-${col.key}-${student.id}`}
                    className={`py-2 px-2 text-right text-xs tabular-nums ${
                      hours ? metricTone(col.key, hours[col.key]) : 'text-gray-300'
                    }`}
                  >
                    {hours ? num(col.key, hours[col.key]) : '—'}
                  </td>
                ))}

                <td className="py-2 px-2 text-right">
                  <button
                    type="button"
                    onClick={() => onAdd(student.id)}
                    disabled={pendingStudentId === student.id}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-40 whitespace-nowrap"
                  >
                    <Plus size={11} />
                    추가
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
