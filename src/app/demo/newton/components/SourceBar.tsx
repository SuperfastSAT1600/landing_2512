'use client';

import { brand } from '../theme';
import { t } from '../i18n';
import { SOURCE_ORDER, sourceBreakdown, type Source } from '../fixtures/applications';

const LABEL: Record<Source, string> = {
  SIS: t.moduleSis,
  LMS: t.moduleLms,
  Advising: t.moduleAdvising,
  Manual: t.moduleManual,
};

// 모듈 색은 아래 체크리스트의 출처 칩과 같은 계열을 쓴다 — 눈으로 바로 연결되도록.
const COLOR: Record<Source, string> = {
  SIS: '#4f46e5',
  LMS: '#0d9488',
  Advising: '#7c3aed',
  Manual: '#cbd5e1',
};

/**
 * SIS·LMS·상담이 하나의 학생 기록을 함께 채운다는 것을 한 화면에서 보여주는 바.
 *
 * 비율 막대로 자동/수동 비중을 즉시 읽히게 하고, 모듈을 누르면 아래 준비물 목록에서
 * 그 모듈이 채운 항목만 강조된다 — '통합됐다'를 문장이 아니라 동작으로 증명하는 부분.
 */
export function SourceBar({
  selected,
  onSelect,
}: {
  selected: Source | null;
  onSelect: (s: Source | null) => void;
}) {
  const breakdown = sourceBreakdown();
  const total = breakdown.reduce((sum, b) => sum + b.count, 0);
  const auto = breakdown.filter(b => b.source !== 'Manual').reduce((sum, b) => sum + b.count, 0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[13px] font-semibold" style={{ color: brand.primary }}>
          {t.oneRecord}
        </p>
        <p className="text-[12px] text-gray-400">
          <span className="text-[17px] font-bold tabular-nums text-gray-900">
            {auto}
            <span className="text-gray-300"> / {total}</span>
          </span>{' '}
          {t.oneRecordHint}
        </p>
      </div>

      {/* 비율 막대 */}
      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        {breakdown.map(b => (
          <button
            key={b.source}
            onClick={() => onSelect(selected === b.source ? null : b.source)}
            aria-label={LABEL[b.source]}
            className="h-full transition-opacity"
            style={{
              width: `${(b.count / total) * 100}%`,
              background: COLOR[b.source],
              opacity: selected && selected !== b.source ? 0.25 : 1,
            }}
          />
        ))}
      </div>

      {/* 모듈 칩 */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SOURCE_ORDER.map(src => {
          const item = breakdown.find(b => b.source === src)!;
          const on = selected === src;
          return (
            <button
              key={src}
              onClick={() => onSelect(on ? null : src)}
              className="rounded-lg border px-3 py-2.5 text-left transition-colors sm:py-2"
              style={{
                borderColor: on ? COLOR[src] : '#e6e8ee',
                background: on ? `${COLOR[src]}0f` : '#fff',
                opacity: selected && !on ? 0.5 : 1,
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLOR[src] }} />
                <span className="truncate text-[12px] sm:text-[11px] text-gray-500">{LABEL[src]}</span>
              </div>
              <p className="mt-0.5 text-[17px] font-bold leading-none tabular-nums text-gray-900">{item.count}</p>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[12px] sm:text-[11px] text-gray-400">{t.clickToHighlight}</p>
    </div>
  );
}

export const SOURCE_COLOR = COLOR;
