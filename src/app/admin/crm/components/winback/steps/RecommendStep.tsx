'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, AlertTriangle, Check } from 'lucide-react';
import type { WinbackCandidate, WinbackRecommendStats } from '@/types/crm';
import type { BriefDraft } from './BriefStep';
import { WinbackRuleFilters, type RuleDraft, EMPTY_RULES, toRuleFilters } from '../WinbackRuleFilters';
import { CandidateCard } from '../CandidateCard';

/** 기본 선택 인원 — 발송은 되돌릴 수 없으므로 전량 자동 선택하지 않는다. */
const DEFAULT_SELECT = 10;
/** 이 적합도 이상만 기본 선택. 미만은 목록에는 남지만 담당자가 직접 고르게 한다. */
const FIT_OK = 3;

interface Props {
  adminKey: string;
  playId: string;
  draft: BriefDraft;
  initialRules?: RuleDraft;
  autoRun?: boolean;
  addButtonLabel?: string;
  recommend: (
    input: Record<string, unknown>
  ) => Promise<{ candidates: WinbackCandidate[]; stats: WinbackRecommendStats }>;
  addTargets: (
    playId: string,
    payload: { candidates: WinbackCandidate[] }
  ) => Promise<{ inserted: unknown[]; skipped: number }>;
  onDone: (result: { inserted: unknown[]; skipped: number }) => void;
}

export function RecommendStep({
  playId,
  draft,
  initialRules,
  autoRun = true,
  addButtonLabel = '선택한 명 타겟 확정',
  recommend,
  addTargets,
  onDone,
}: Props) {
  const [rules, setRules] = useState<RuleDraft>(initialRules ?? EMPTY_RULES);
  const [candidates, setCandidates] = useState<WinbackCandidate[]>([]);
  const [stats, setStats] = useState<WinbackRecommendStats | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await recommend({
        brief: {
          brief: draft.product_brief,
          product_category: draft.product_category || null,
          target_exam_date: draft.target_exam_date || null,
          product_price: draft.product_price ? Number(draft.product_price) : null,
          product_hours: draft.product_hours ? Number(draft.product_hours) : null,
        },
        rules: toRuleFilters(rules),
        play_id: playId,
        cooldown_days: Number(draft.contact_cooldown_days) || 30,
      });
      setCandidates(result.candidates);
      setStats(result.stats);
      // 기본 선택은 상위 10명 — 단 AI가 "근거 약함"(fit<=2)으로 본 후보는 빼고 고른다.
      // 전량 자동 선택하지 않는 이유: 발송은 되돌릴 수 없다.
      setSelected(
        new Set(
          result.candidates
            .filter((c) => c.llm_fit == null || c.llm_fit >= FIT_OK)
            .slice(0, DEFAULT_SELECT)
            .map((c) => c.student_id)
        )
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [draft, playId, recommend, rules]);

  // 진입 즉시 1회 추천 — 담당자가 버튼을 한 번 더 누르게 하지 않는다.
  useEffect(() => {
    if (autoRun) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = await addTargets(playId, {
        candidates: candidates.filter((c) => selected.has(c.student_id)),
      });
      onDone(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <WinbackRuleFilters rules={rules} onChange={setRules} onApply={run} busy={loading} />

      {stats && (
        <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* 어느 단계에서 후보가 줄었는지 화면만 보고 판별할 수 있게 퍼널을 그대로 노출한다. */}
          <span>
            사전필터 {stats.prefiltered.toLocaleString()}명
            {stats.reranked != null && <> → AI 검토 {stats.reranked}명</>}
            {stats.judged != null && <> (판정 {stats.judged}명)</>} → 노출 {candidates.length}명
          </span>
          <span>유사도 계산 {stats.embedded}명</span>
          <span>{stats.llm_used ? 'AI 재랭킹 적용' : 'AI 재랭킹 미적용(규칙 점수만)'}</span>
          {stats.degraded_reason && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle size={11} /> {stats.degraded_reason}
            </span>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> 리드를 고르는 중…
        </div>
      ) : candidates.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          조건에 맞는 리드가 없습니다. 필터를 넓혀보세요.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              추천 {candidates.length}명 · 선택 <b className="text-gray-900">{selected.size}</b>명
            </span>
            <button
              type="button"
              onClick={() =>
                setSelected(
                  selected.size === candidates.length
                    ? new Set()
                    : new Set(candidates.map((c) => c.student_id))
                )
              }
              className="text-gray-500 hover:text-gray-800"
            >
              {selected.size === candidates.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          <ul className="space-y-1.5">
            {candidates.map((c) => (
              <CandidateCard
                key={c.student_id}
                candidate={c}
                checked={selected.has(c.student_id)}
                onToggle={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(c.student_id)) next.delete(c.student_id);
                    else next.add(c.student_id);
                    return next;
                  })
                }
              />
            ))}
          </ul>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSave}
              disabled={selected.size === 0 || saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-40"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {addButtonLabel.replace('명', `${selected.size}명`)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
