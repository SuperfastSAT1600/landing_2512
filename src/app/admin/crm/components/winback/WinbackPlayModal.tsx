'use client';

import { useState } from 'react';
import { X, Loader2, Sparkles, ChevronLeft } from 'lucide-react';
import type { WinbackCandidate, WinbackRecommendStats } from '@/types/crm';
import { BriefStep, type BriefDraft, EMPTY_BRIEF } from './steps/BriefStep';
import { RecommendStep } from './steps/RecommendStep';

interface Props {
  adminKey: string;
  onClose: () => void;
  /** 플레이 생성 → 추천 → 타겟 확정까지 끝나면 상세로 이동시킨다. */
  onCreated: (playId: string) => void;
  createPlay: (input: Record<string, unknown>) => Promise<{ id: string }>;
  recommend: (
    input: Record<string, unknown>
  ) => Promise<{ candidates: WinbackCandidate[]; stats: WinbackRecommendStats }>;
  addTargets: (
    playId: string,
    payload: { candidates: WinbackCandidate[] }
  ) => Promise<{ inserted: unknown[]; skipped: number }>;
  createdBy?: string;
}

/**
 * 새 플레이 위저드 — ① 상품 브리프·전략 변형 입력 → ② 추천 리드 확인·확정.
 * 상품 마스터가 없으므로 상품은 매 플레이마다 여기서 직접 정의한다.
 */
export function WinbackPlayModal({
  adminKey,
  onClose,
  onCreated,
  createPlay,
  recommend,
  addTargets,
  createdBy,
}: Props) {
  const [step, setStep] = useState<'brief' | 'recommend'>('brief');
  const [draft, setDraft] = useState<BriefDraft>(EMPTY_BRIEF);
  const [playId, setPlayId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNext() {
    setBusy(true);
    setError(null);
    try {
      const play = await createPlay({
        title: draft.title.trim() || draft.product_brief.slice(0, 30),
        product_brief: draft.product_brief,
        product_category: draft.product_category || null,
        product_price: draft.product_price ? Number(draft.product_price) : null,
        product_hours: draft.product_hours ? Number(draft.product_hours) : null,
        target_exam_date: draft.target_exam_date || null,
        audience_hint: draft.audience_hint || null,
        conversion_window_days: Number(draft.conversion_window_days) || 45,
        contact_cooldown_days: Number(draft.contact_cooldown_days) || 30,
        variants: draft.variants.filter((v) => v.name.trim()),
        created_by: createdBy ?? null,
      });
      setPlayId(play.id);
      setStep('recommend');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const canProceed = draft.product_brief.trim().length > 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {step === 'recommend' && (
              <button
                onClick={() => setStep('brief')}
                className="text-gray-400 hover:text-gray-700"
                aria-label="브리프로 돌아가기"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <Sparkles size={16} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              {step === 'brief' ? '새 윈백 플레이 — 상품 정의' : '추천 리드 선택'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'brief' ? (
            <BriefStep draft={draft} onChange={setDraft} />
          ) : (
            playId && (
              <RecommendStep
                adminKey={adminKey}
                playId={playId}
                draft={draft}
                recommend={recommend}
                addTargets={addTargets}
                onDone={() => onCreated(playId)}
              />
            )
          )}
        </div>

        {step === 'brief' && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
            {error ? (
              <p className="text-xs text-red-500">{error}</p>
            ) : (
              <p className="text-[11px] text-gray-400">
                상품 설명이 구체적일수록 추천이 정확해집니다 (과목·학년·시험 시기·가격).
              </p>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed || busy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-40"
            >
              {busy && <Loader2 size={13} className="animate-spin" />}
              리드 추천받기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
