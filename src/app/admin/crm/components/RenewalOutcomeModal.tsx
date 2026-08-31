'use client';

// 결제 완료·미전환 카드의 결과 품질과 사유를 기록·수정한다.
// 카드는 min-w-40 이라 인라인 입력이 안 들어가서 모달로 뺐다. 이미 품질이 찍힌 카드도
// 여기로 들어오므로 "사유 없이 품질만 있던" 과거 기록을 보정하는 경로이기도 하다.

import { X, RefreshCw } from 'lucide-react';
import {
  getRenewalOutcomeQualityLabel,
  type RenewalOutcomeQuality,
  type RenewalTarget,
} from '@/types/crm';
import { RenewalOutcomeFields, useRenewalOutcomeForm } from './RenewalOutcomeFields';

interface RenewalOutcomeModalProps {
  target: RenewalTarget;
  /** 카드에서 방금 누른 값 — 저장된 값보다 우선한다. */
  initialQuality: RenewalOutcomeQuality;
  onConfirm: (input: {
    quality: RenewalOutcomeQuality;
    reasonTag: string;
    reasonNote: string;
  }) => void;
  /** 품질과 사유를 모두 비운다(미분류로 되돌리기). */
  onClear: () => void;
  onClose: () => void;
}

export function RenewalOutcomeModal({
  target,
  initialQuality,
  onConfirm,
  onClear,
  onClose,
}: RenewalOutcomeModalProps) {
  const form = useRenewalOutcomeForm(target.stage, {
    quality: initialQuality,
    // 저장된 사유는 같은 품질일 때만 이어받는다 — 품질을 바꿔 들어왔으면 목록이 다르다.
    reasonTag: target.outcome_quality === initialQuality ? target.outcome_reason_tag : '',
    note: target.outcome_quality === initialQuality ? target.outcome_reason_note : '',
  });

  const isPaid = target.stage === '4';

  function handleConfirm() {
    if (!form.canSubmit || !form.quality) return;
    onConfirm({
      quality: form.quality,
      reasonTag: form.reasonTag,
      reasonNote: form.note.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-gray-50 rounded-xl border border-gray-200 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">
              {isPaid ? '재결제 결과 기록' : '이탈 결과 기록'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2.5">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{target.student?.name}</span> 학생을{' '}
              <span className="font-semibold">
                {getRenewalOutcomeQualityLabel(target.stage, initialQuality)}
              </span>
              로 기록합니다.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              학생 상담 타임라인(내부 전용)과 슬랙 상담 채널에도 함께 남습니다.
            </p>
          </div>

          <RenewalOutcomeFields
            stage={target.stage}
            form={form}
            qualityLabel={isPaid ? '재결제 유형' : '이탈 유형'}
            notePlaceholder={isPaid ? '예: 20% 할인 요구해서 겨우 연장' : '예: 9월 시험 이후 재논의 요청'}
          />
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-200">
          {target.outcome_quality ? (
            <button
              onClick={onClear}
              className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-rose-600 transition-colors"
            >
              선택 해제
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={!form.canSubmit}
              className="px-4 py-2 text-sm font-semibold text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-800"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
