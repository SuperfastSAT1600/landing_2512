'use client';

import { Filter, Loader2 } from 'lucide-react';
import { GRADE_OPTIONS, CHURN_TAG_OPTIONS, type WinbackRuleFilters as RuleFilters } from '@/types/crm';

export interface RuleDraft {
  grades: string[];
  schoolTypes: string[];
  churnTagPrefixes: string[];
  churnedAfterDays: string;
  churnedWithinDays: string;
  excludeRecentContactDays: string;
  campaignTagKeyword: string;
}

export const EMPTY_RULES: RuleDraft = {
  grades: [],
  schoolTypes: [],
  churnTagPrefixes: [],
  churnedAfterDays: '',
  churnedWithinDays: '',
  excludeRecentContactDays: '14',
  campaignTagKeyword: '',
};

const SCHOOL_TYPES = ['한국 학제', 'AP', 'IB'];

/** UI 초안 → API 규칙 필터. 빈 값은 조건 자체를 만들지 않는다. */
export function toRuleFilters(d: RuleDraft): RuleFilters {
  const num = (v: string) => (v.trim() ? Number(v) : undefined);
  return {
    ...(d.grades.length ? { grades: d.grades } : {}),
    ...(d.schoolTypes.length ? { school_types: d.schoolTypes } : {}),
    ...(d.churnTagPrefixes.length ? { churn_tag_prefixes: d.churnTagPrefixes } : {}),
    ...(d.campaignTagKeyword.trim() ? { campaign_tag_any: [d.campaignTagKeyword.trim()] } : {}),
    ...(num(d.churnedAfterDays) != null ? { churned_after_days: num(d.churnedAfterDays) } : {}),
    ...(num(d.churnedWithinDays) != null ? { churned_within_days: num(d.churnedWithinDays) } : {}),
    ...(num(d.excludeRecentContactDays) != null
      ? { exclude_recent_contact_days: num(d.excludeRecentContactDays) }
      : {}),
  };
}

const chip = (active: boolean) =>
  `px-2 py-0.5 text-[11px] rounded-full border transition-colors ${
    active
      ? 'border-gray-900 bg-gray-900 text-white'
      : 'border-gray-200 text-gray-500 hover:border-gray-400'
  }`;

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function WinbackRuleFilters({
  rules,
  onChange,
  onApply,
  busy,
}: {
  rules: RuleDraft;
  onChange: (r: RuleDraft) => void;
  onApply: () => void;
  busy?: boolean;
}) {
  const set = (patch: Partial<RuleDraft>) => onChange({ ...rules, ...patch });
  const numInput =
    'w-16 px-1.5 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-gray-400';

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
        <Filter size={11} /> 후보 조건
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[11px] text-gray-400 w-14">학년</span>
        {GRADE_OPTIONS.filter((g) => g.endsWith('th')).map((g) => (
          <button key={g} type="button" onClick={() => set({ grades: toggle(rules.grades, g) })} className={chip(rules.grades.includes(g))}>
            {g}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[11px] text-gray-400 w-14">학제</span>
        {SCHOOL_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => set({ schoolTypes: toggle(rules.schoolTypes, t) })}
            className={chip(rules.schoolTypes.includes(t))}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[11px] text-gray-400 w-14">이탈 사유</span>
        {CHURN_TAG_OPTIONS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => set({ churnTagPrefixes: toggle(rules.churnTagPrefixes, t) })}
            className={chip(rules.churnTagPrefixes.includes(t))}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-gray-500">
        <label className="flex items-center gap-1">
          이탈 경과
          <input
            type="number"
            value={rules.churnedAfterDays}
            onChange={(e) => set({ churnedAfterDays: e.target.value })}
            placeholder="최소"
            className={numInput}
          />
          ~
          <input
            type="number"
            value={rules.churnedWithinDays}
            onChange={(e) => set({ churnedWithinDays: e.target.value })}
            placeholder="최대"
            className={numInput}
          />
          일
        </label>
        <label className="flex items-center gap-1">
          최근 컨택 제외
          <input
            type="number"
            value={rules.excludeRecentContactDays}
            onChange={(e) => set({ excludeRecentContactDays: e.target.value })}
            className={numInput}
          />
          일
        </label>
        <label className="flex items-center gap-1">
          캠페인 태그
          <input
            value={rules.campaignTagKeyword}
            onChange={(e) => set({ campaignTagKeyword: e.target.value })}
            placeholder="예: AP 문의"
            className="w-24 px-1.5 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-gray-400"
          />
        </label>

        <button
          type="button"
          onClick={onApply}
          disabled={busy}
          className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          {busy && <Loader2 size={10} className="animate-spin" />}
          다시 추천
        </button>
      </div>
    </div>
  );
}
