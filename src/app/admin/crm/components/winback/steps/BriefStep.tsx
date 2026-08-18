'use client';

import { Plus, Trash2 } from 'lucide-react';
import { PRODUCT_CATEGORY_OPTIONS, BRIEF_PRESETS } from '../presets';

export interface BriefDraft {
  title: string;
  product_brief: string;
  product_category: string;
  product_price: string;
  product_hours: string;
  target_exam_date: string;
  audience_hint: string;
  conversion_window_days: string;
  contact_cooldown_days: string;
  variants: { name: string; angle: string }[];
}

export const EMPTY_BRIEF: BriefDraft = {
  title: '',
  product_brief: '',
  product_category: '',
  product_price: '',
  product_hours: '',
  target_exam_date: '',
  audience_hint: '',
  conversion_window_days: '45',
  contact_cooldown_days: '30',
  variants: [{ name: '기본', angle: '' }],
};

const label = 'block text-[11px] font-medium text-gray-500 mb-1';
const input =
  'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400';

export function BriefStep({
  draft,
  onChange,
}: {
  draft: BriefDraft;
  onChange: (d: BriefDraft) => void;
}) {
  const set = (patch: Partial<BriefDraft>) => onChange({ ...draft, ...patch });

  const setVariant = (i: number, patch: Partial<{ name: string; angle: string }>) => {
    const variants = draft.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v));
    set({ variants });
  };

  return (
    <div className="space-y-4">
      {/* 프리셋 — 우리가 실제로 파는 상품에서 출발하게 한다(pricing.ts 기준) */}
      <div>
        <span className={label}>빠른 시작</span>
        <div className="flex flex-wrap gap-1.5">
          {BRIEF_PRESETS.map((preset) => (
            <button
              key={preset.title}
              type="button"
              onClick={() => set({ ...preset.draft, variants: draft.variants })}
              className="px-2.5 py-1 text-[11px] rounded-full border border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50/60"
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={label} htmlFor="wb-brief">
          판매할 상품 설명 <span className="text-red-400">*</span>
        </label>
        <textarea
          id="wb-brief"
          value={draft.product_brief}
          onChange={(e) => set({ product_brief: e.target.value })}
          rows={4}
          placeholder="예: AP Calculus BC 16시간권(Lite), 9~11학년 대상, 내년 5월 AP 시험 대비, 144만원. 시험 전 단기 집중이 필요한 학생에게 제안."
          className={input}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="wb-title">
            캠페인 이름
          </label>
          <input
            id="wb-title"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="비우면 상품 설명 앞부분 사용"
            className={input}
          />
        </div>
        <div>
          <label className={label} htmlFor="wb-category">
            결제 귀속 상품 분류
          </label>
          <select
            id="wb-category"
            value={draft.product_category}
            onChange={(e) => set({ product_category: e.target.value })}
            className={input}
          >
            <option value="">선택 안 함</option>
            {PRODUCT_CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="wb-price">
            가격(원)
          </label>
          <input
            id="wb-price"
            type="number"
            value={draft.product_price}
            onChange={(e) => set({ product_price: e.target.value })}
            className={input}
          />
        </div>
        <div>
          <label className={label} htmlFor="wb-hours">
            수업 시간
          </label>
          <input
            id="wb-hours"
            type="number"
            value={draft.product_hours}
            onChange={(e) => set({ product_hours: e.target.value })}
            className={input}
          />
        </div>
        <div>
          <label className={label} htmlFor="wb-exam">
            목표 시험일
          </label>
          <input
            id="wb-exam"
            type="date"
            value={draft.target_exam_date}
            onChange={(e) => set({ target_exam_date: e.target.value })}
            className={input}
          />
        </div>
        <div>
          <label className={label} htmlFor="wb-window">
            전환 인정 기간(일)
          </label>
          <input
            id="wb-window"
            type="number"
            value={draft.conversion_window_days}
            onChange={(e) => set({ conversion_window_days: e.target.value })}
            className={input}
          />
        </div>
      </div>

      {/* 전략 변형(A/B) */}
      <div>
        <span className={label}>전략 변형 — 접근 각도별 반응을 비교합니다</span>
        <div className="space-y-2">
          {draft.variants.map((v, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={v.name}
                onChange={(e) => setVariant(i, { name: e.target.value })}
                placeholder="변형 이름 (예: 가격 민감형)"
                className={`${input} w-40`}
              />
              <input
                value={v.angle}
                onChange={(e) => setVariant(i, { angle: e.target.value })}
                placeholder="접근 각도 — 메시지 작성 지침 (예: 단기 부담 낮춘 패키지 강조)"
                className={input}
              />
              {draft.variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => set({ variants: draft.variants.filter((_, idx) => idx !== i) })}
                  className="text-gray-300 hover:text-red-500 px-1"
                  aria-label="변형 삭제"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        {draft.variants.length < 3 && (
          <button
            type="button"
            onClick={() => set({ variants: [...draft.variants, { name: '', angle: '' }] })}
            className="mt-2 flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700"
          >
            <Plus size={12} /> 변형 추가 (A/B 비교)
          </button>
        )}
      </div>
    </div>
  );
}
