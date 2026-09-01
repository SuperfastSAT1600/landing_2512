'use client';

// 재결제 미전환 종결. 하드 삭제와 달리 주차 코호트에 행이 남아 전환율 분모가 보존된다.
// 이탈 유형과 사유를 함께 받는다 — 사유 목록은 유형(좋은/나쁜 이탈)에 따라 달라진다.

import { X, AlertTriangle } from 'lucide-react';
import type { RenewalOutcomeQuality, RenewalTarget } from '@/types/crm';
import { RenewalOutcomeFields, useRenewalOutcomeForm } from './RenewalOutcomeFields';

interface RenewalDropModalProps {
  target: RenewalTarget;
  onConfirm: (input: {
    quality: RenewalOutcomeQuality;
    reasonTag: string;
    reasonNote: string;
  }) => void;
  onClose: () => void;
}

export function RenewalDropModal({ target, onConfirm, onClose }: RenewalDropModalProps) {
  // 기본값을 두지 않는다 — 기본 선택이 있으면 무의식적으로 한쪽만 쌓인다.
  const form = useRenewalOutcomeForm('5');

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
            <AlertTriangle size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">미전환 처리</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2.5">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{target.student?.name}</span> 학생을 이번 주차
              미전환으로 종결합니다.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              선정 인원에는 그대로 남아 전환율 분모에 반영됩니다. 기록은 학생 상담 타임라인과 슬랙에도
              남습니다.
            </p>
          </div>

          <RenewalOutcomeFields
            stage="5"
            form={form}
            qualityLabel="이탈 유형"
            notePlaceholder="예: 9월 시험 이후 재논의 요청"
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200">
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
            미전환 처리
          </button>
        </div>
      </div>
    </div>
  );
}
