'use client';

// 재결제 미전환 종결. 하드 삭제와 달리 주차 코호트에 행이 남아 전환율 분모가 보존된다.
// 형식은 ChurnModal을 따른다.

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import {
  RENEWAL_DROP_REASONS,
  RENEWAL_DROP_QUALITY_LABELS,
  RENEWAL_OUTCOME_QUALITIES,
  type RenewalOutcomeQuality,
  type RenewalTarget,
} from '@/types/crm';

interface RenewalDropModalProps {
  target: RenewalTarget;
  onConfirm: (dropReason: string, quality: RenewalOutcomeQuality) => void;
  onClose: () => void;
}

export function RenewalDropModal({ target, onConfirm, onClose }: RenewalDropModalProps) {
  const [reasonTag, setReasonTag] = useState<string>(RENEWAL_DROP_REASONS[0]);
  const [note, setNote] = useState('');
  // 사유와 달리 기본값을 두지 않는다 — 기본 선택이 있으면 무의식적으로 한쪽만 쌓인다.
  const [quality, setQuality] = useState<RenewalOutcomeQuality | null>(null);

  function handleConfirm() {
    if (!quality) return;
    // ChurnModal과 동일하게 "{태그}: {메모}" 로 합쳐 저장. 메모는 선택.
    const trimmed = note.trim();
    onConfirm(trimmed ? `${reasonTag}: ${trimmed}` : reasonTag, quality);
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
              선정 인원에는 그대로 남아 전환율 분모에 반영됩니다. 다음 주차에 다시 선정할 수 있습니다.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">미전환 사유</label>
            <select
              value={reasonTag}
              onChange={e => setReasonTag(e.target.value)}
              className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none transition-all"
            >
              {RENEWAL_DROP_REASONS.map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">이탈 유형</label>
            <div className="flex gap-2">
              {RENEWAL_OUTCOME_QUALITIES.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  aria-pressed={quality === q}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    quality === q
                      ? q === 'good'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {RENEWAL_DROP_QUALITY_LABELS[q]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">메모 (선택)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="예: 9월 시험 이후 재논의 요청"
              rows={2}
              className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all resize-none"
            />
          </div>
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
            disabled={!quality}
            className="px-4 py-2 text-sm font-semibold text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-800"
          >
            미전환 처리
          </button>
        </div>
      </div>
    </div>
  );
}
