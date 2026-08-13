'use client';

import { useState } from 'react';
import { brand } from '../theme';
import { t, SOURCE_LABEL } from '../i18n';
import {
  CONSOLE_MODULES,
  CONSOLE_STUDENT,
  GROUP_LABEL,
  groupCount,
  type ModuleGroup,
} from '../fixtures/console';

// 그룹 색 — AS-IS 도식·원서 출처 칩과 같은 계열을 써서 눈으로 연결된다.
const GROUP_COLOR: Record<ModuleGroup, string> = {
  SIS: '#4f46e5',
  LMS: '#0d9488',
  College: '#c2410c',
  Advising: '#7c3aed',
};

/**
 * 하나의 학생 · 하나의 화면 · 모듈만 바뀌는 콘솔.
 *
 * 학생 헤더를 고정해두는 것이 이 데모의 전부다. 모듈을 눌러도 학생이 그대로면
 * "제품을 옮겨 다니는 게 아니라 같은 기록을 다른 각도로 본다"가 설명 없이 전달된다.
 */
export function UnifiedConsole() {
  const [activeKey, setActiveKey] = useState(CONSOLE_MODULES[0].key);
  const active = CONSOLE_MODULES.find(m => m.key === activeKey) ?? CONSOLE_MODULES[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* 고정 학생 헤더 — 모듈이 바뀌어도 이 줄은 변하지 않는다 */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-gray-100 px-5 py-3.5">
        <div>
          <p className="text-[16px] font-bold leading-tight text-gray-900">{CONSOLE_STUDENT.name}</p>
          <p className="mt-0.5 text-[12px] sm:text-[11.5px] text-gray-400">
            {CONSOLE_STUDENT.meta} · {CONSOLE_STUDENT.since}
          </p>
        </div>
        <span className="font-serif text-[12px] sm:text-[11px] tracking-[0.18em] text-gray-300">EDUMO</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr]">
        {/* 모듈 사이드바 — 원래 따로 사야 하는 제품들이 한 줄에 나열된다 */}
        <nav className="border-b border-gray-100 py-2 sm:border-b-0 sm:border-r">
          {CONSOLE_MODULES.map((m, i) => {
            const on = m.key === activeKey;
            const newGroup = i === 0 || CONSOLE_MODULES[i - 1].group !== m.group;
            return (
              <div key={m.key}>
                {newGroup && (
                  <p
                    className="px-4 pb-1 pt-2.5 text-[11px] sm:text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: GROUP_COLOR[m.group] }}
                  >
                    {GROUP_LABEL[m.group]}
                  </p>
                )}
                <button
                  onClick={() => setActiveKey(m.key)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] transition-colors sm:py-1.5"
                  style={
                    on
                      ? { background: '#f2f4ff', color: brand.primary, fontWeight: 600 }
                      : { color: '#6b7180' }
                  }
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: on ? GROUP_COLOR[m.group] : '#d4d7e0' }}
                  />
                  {m.label}
                </button>
              </div>
            );
          })}
        </nav>

        {/* 선택한 모듈의 내용 */}
        <div className="min-w-0 px-5 py-4">
          <div className="flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 text-[11px] sm:text-[10px] font-bold uppercase tracking-wide text-white"
              style={{ background: GROUP_COLOR[active.group] }}
            >
              {GROUP_LABEL[active.group]}
            </span>
            <p className="text-[13px] font-semibold text-gray-800">{active.label}</p>
          </div>

          <dl className="mt-3 divide-y divide-gray-50">
            {active.rows.map(r => (
              <div key={r.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
                <dt className="text-[12.5px] text-gray-500">{r.label}</dt>
                <dd className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
                  {r.value}
                  {r.sub && <span className="text-[12px] sm:text-[11px] font-normal text-gray-400">{r.sub}</span>}
                  {r.from && (
                    <span
                      className="rounded border px-1.5 py-0.5 text-[11px] sm:text-[10px] font-medium"
                      style={{
                        borderColor: `${GROUP_COLOR[r.from]}33`,
                        background: `${GROUP_COLOR[r.from]}0f`,
                        color: GROUP_COLOR[r.from],
                      }}
                    >
                      {/* 칩은 짧게 — 원서 화면의 출처 칩과 같은 표기를 쓴다. */}
                      {t.fromSource(SOURCE_LABEL[r.from] ?? GROUP_LABEL[r.from])}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 border-t border-gray-100 pt-3 text-[12px] sm:text-[11.5px] text-gray-400">
            {t.sameStudentHint(groupCount())}
          </p>
        </div>
      </div>
    </div>
  );
}
