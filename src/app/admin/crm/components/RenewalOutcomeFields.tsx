'use client';

// 재결제 결과(품질 + 사유 + 메모) 입력 한 벌.
// 미전환 처리 모달과 결과 사유 모달이 같은 규칙을 써야 하므로 여기로 모았다 —
// 특히 "품질이 바뀌면 사유 목록이 통째로 달라진다"는 규칙이 두 곳에서 어긋나면
// 목록에 없는 사유가 저장된다.

import { useState } from 'react';
import {
  RENEWAL_OUTCOME_QUALITIES,
  getRenewalOutcomeQualityLabel,
  getRenewalOutcomeReasons,
  type RenewalOutcomeQuality,
  type RenewalStage,
} from '@/types/crm';

export interface RenewalOutcomeFormState {
  quality: RenewalOutcomeQuality | null;
  setQuality: (q: RenewalOutcomeQuality) => void;
  reasonTag: string;
  setReasonTag: (t: string) => void;
  note: string;
  setNote: (n: string) => void;
  /** 품질과 사유가 모두 정해져야 저장할 수 있다. */
  canSubmit: boolean;
}

export function useRenewalOutcomeForm(
  stage: RenewalStage,
  initial?: { quality?: RenewalOutcomeQuality | null; reasonTag?: string | null; note?: string | null }
): RenewalOutcomeFormState {
  const [quality, setQualityState] = useState<RenewalOutcomeQuality | null>(initial?.quality ?? null);
  const [reasonTag, setReasonTag] = useState(initial?.reasonTag ?? '');
  const [note, setNote] = useState(initial?.note ?? '');

  const setQuality = (q: RenewalOutcomeQuality) => {
    setQualityState(q);
    // 이전 사유가 새 목록에 없으면 비운다 — 남겨두면 저장 시 서버가 400 을 준다.
    setReasonTag((prev) => (getRenewalOutcomeReasons(stage, q).includes(prev) ? prev : ''));
  };

  return {
    quality,
    setQuality,
    reasonTag,
    setReasonTag,
    note,
    setNote,
    canSubmit: Boolean(quality && reasonTag),
  };
}

/** 품질 2택 → 품질별 사유 셀렉트 → 자유 메모. 품질을 고르기 전엔 사유를 못 고른다. */
export function RenewalOutcomeFields({
  stage,
  form,
  qualityLabel = '결과',
  notePlaceholder,
}: {
  stage: RenewalStage;
  form: RenewalOutcomeFormState;
  qualityLabel?: string;
  notePlaceholder?: string;
}) {
  const reasons = form.quality ? getRenewalOutcomeReasons(stage, form.quality) : [];

  return (
    <>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-400">{qualityLabel}</label>
        <div className="flex gap-2">
          {RENEWAL_OUTCOME_QUALITIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => form.setQuality(q)}
              aria-pressed={form.quality === q}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                form.quality === q
                  ? q === 'good'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {getRenewalOutcomeQualityLabel(stage, q)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-400">사유</label>
        <select
          value={form.reasonTag}
          onChange={(e) => form.setReasonTag(e.target.value)}
          disabled={!form.quality}
          aria-label="사유"
          className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400"
        >
          <option value="">{form.quality ? '사유를 선택하세요' : '먼저 결과를 선택하세요'}</option>
          {reasons.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-400">메모 (선택)</label>
        <textarea
          value={form.note}
          onChange={(e) => form.setNote(e.target.value)}
          placeholder={notePlaceholder}
          rows={2}
          className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all resize-none"
        />
      </div>
    </>
  );
}
