'use client';

import { brand } from '../theme';
import { t } from '../i18n';

/**
 * 상담 기록 → AI → 이번 주/달/분기 로 갈라지는 흐름 도식.
 *
 * 이 화면이 무엇을 하는 물건인지 문장을 읽지 않고도 알게 하는 것이 목적이다.
 * 분석 실행 시 왼쪽에서 오른쪽으로 순차 등장한다(CSS 애니메이션, 총 1.1초).
 */
export function WorkFlowDiagram({
  noteCount,
  counts,
  playing,
}: {
  noteCount: number;
  counts: { week: number; month: number; quarter: number };
  /** true면 등장 애니메이션을 재생한다. */
  playing: boolean;
}) {
  const buckets = [
    { label: t.thisWeek, n: counts.week, delay: 420 },
    { label: t.thisMonth, n: counts.month, delay: 500 },
    { label: t.thisQuarter, n: counts.quarter, delay: 580 },
  ];

  const anim = (delay: number) =>
    playing ? { animation: `wfIn 340ms ease-out ${delay}ms both` } : undefined;

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* 쌓인 기록 */}
      <div
        className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
        style={anim(0)}
      >
        <div className="relative h-9 w-8 shrink-0" aria-hidden>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="absolute rounded-sm border border-gray-300 bg-gray-50"
              style={{ inset: 0, transform: `translate(${i * 3}px, ${-i * 3}px)` }}
            />
          ))}
        </div>
        <div>
          <p className="text-[19px] font-bold leading-none tabular-nums text-gray-900">{noteCount}</p>
          <p className="mt-1 text-[12px] sm:text-[11px] text-gray-400">{t.flowNotes}</p>
        </div>
      </div>

      <Arrow style={anim(200)} />

      {/* AI */}
      <div
        className="flex items-center justify-center rounded-xl px-4 py-3 text-center"
        style={{ background: brand.primary, ...anim(260) }}
      >
        <p className="text-[13px] font-semibold text-white">{t.flowAi}</p>
      </div>

      <Arrow style={anim(370)} />

      {/* 3개 구간 */}
      <div className="grid flex-1 grid-cols-3 gap-2">
        {buckets.map(b => (
          <div
            key={b.label}
            className="rounded-xl border bg-white px-3 py-3 text-center"
            style={{ borderColor: '#dfe3ee', ...anim(b.delay) }}
          >
            <p className="text-[19px] font-bold leading-none tabular-nums" style={{ color: brand.accent }}>
              {b.n}
            </p>
            <p className="mt-1 text-[12px] sm:text-[11px] leading-tight text-gray-500">{b.label}</p>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes wfIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

function Arrow({ style }: { style?: React.CSSProperties }) {
  return (
    <div className="flex shrink-0 items-center justify-center sm:w-4" style={style} aria-hidden>
      <svg width="16" height="16" viewBox="0 0 16 16" className="rotate-90 sm:rotate-0">
        <path d="M1 8h11M9 4.5 12.5 8 9 11.5" fill="none" stroke="#b9bed0" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}
