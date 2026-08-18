'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Loader2, RefreshCw, Send, MailX, Trash2, Sparkles, X } from 'lucide-react';
import type { WinbackPlayDetailData, WinbackTargetRow as TargetRow } from './hooks/useWinbackPlays';
import { WinbackTargetRow } from './WinbackTargetRow';
import { RecommendStep } from './steps/RecommendStep';
import { playToBriefDraft, playToRuleDraft } from './winbackContinuation';
import type { WinbackCandidate, WinbackRecommendStats } from '@/types/crm';

interface Props {
  playId: string;
  userName?: string;
  onBack: () => void;
  fetchPlay: (playId: string) => Promise<WinbackPlayDetailData>;
  patchTarget: (targetId: string, patch: Record<string, unknown>) => Promise<TargetRow>;
  generateDraft?: (targetId: string) => Promise<TargetRow>;
  bulkTargets: (payload: {
    target_ids: string[];
    action: string;
    author?: string;
    messages?: Record<string, string>;
  }) => Promise<{ updated: TargetRow[]; failed: { id: string; error: string }[] }>;
  deletePlay: (playId: string) => Promise<void>;
  onStudentClick?: (studentId: string) => void;
  recommend?: (
    input: Record<string, unknown>
  ) => Promise<{ candidates: WinbackCandidate[]; stats: WinbackRecommendStats }>;
  addTargets?: (
    playId: string,
    payload: { candidates: WinbackCandidate[] }
  ) => Promise<{ inserted: unknown[]; skipped: number }>;
}

const STAT = 'flex-1 min-w-[92px] bg-white border border-gray-100 rounded-lg px-3 py-2';

export function WinbackPlayDetail({
  playId,
  userName,
  onBack,
  fetchPlay,
  patchTarget,
  generateDraft,
  bulkTargets,
  deletePlay,
  onStudentClick,
  recommend,
  addTargets,
}: Props) {
  const [play, setPlay] = useState<WinbackPlayDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Record<string, string>>({});

  const [showAdditionalSearch, setShowAdditionalSearch] = useState(false);
  const [addMessage, setAddMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlay(await fetchPlay(playId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fetchPlay, playId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(async () => {
    if (!play) return;
    if (!confirm(`"${play.title}" 캠페인을 삭제할까요? 타겟·변형 기록도 함께 삭제됩니다.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await deletePlay(playId);
      onBack();
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  }, [play, playId, deletePlay, onBack]);

  const variantName = useCallback(
    (variantId: string | null) =>
      play?.variants.find((v) => v.id === variantId)?.name ?? '변형 미지정',
    [play]
  );

  const targets = useMemo(() => play?.targets ?? [], [play]);
  const funnel = useMemo(() => {
    const active = targets.filter((t) => t.status !== 'skipped');
    return {
      targeted: active.length,
      sent: active.filter((t) => t.sent_at).length,
      responded: active.filter((t) => t.response && t.response !== 'none').length,
      reconnected: active.filter((t) => t.reconnected_at).length,
      converted: active.filter((t) => t.converted_at).length,
    };
  }, [targets]);

  async function handleBulk(action: string, targetIds?: string[], message?: string) {
    const ids = targetIds ?? [...selected];
    if (ids.length === 0) return;
    const sentMessages = message === undefined
      ? Object.fromEntries(ids.map((id) => [id, messages[id]]).filter(([, value]) => value !== undefined))
      : { [ids[0]]: message };
    try {
      const result = await bulkTargets({
        target_ids: ids,
        action,
        author: userName,
        ...(action === 'mark_sent' && Object.keys(sentMessages).length > 0 ? { messages: sentMessages } : {}),
      });
      if (action === 'mark_sent' && result.failed.length > 0 && result.updated.length === 0) {
        throw new Error(result.failed[0].error);
      }
      if (action === 'mark_sent') {
        setMessages((prev) => {
          const next = { ...prev };
          ids.forEach((id) => delete next[id]);
          return next;
        });
      }
      if (result.failed.length > 0) {
        setError(`${result.failed.length}건 실패: ${result.failed[0].error}`);
      }
      setSelected(new Set());
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handlePatch(targetId: string, patch: Record<string, unknown>) {
    try {
      await patchTarget(targetId, patch);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading && !play) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
        <Loader2 size={16} className="animate-spin" /> 불러오는 중…
      </div>
    );
  }
  if (!play) {
    return (
      <div className="py-12 text-center space-y-2">
        <p className="text-sm text-red-500">{error ?? '캠페인을 불러오지 못했습니다.'}</p>
        <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-800">
          목록으로
        </button>
      </div>
    );
  }

  const sentRate = (n: number) => (funnel.sent > 0 ? `${Math.round((n / funnel.sent) * 100)}%` : '-');

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
          >
            <ChevronLeft size={13} /> 캠페인 목록
          </button>
          <h3 className="mt-1 text-base font-semibold text-gray-900">{play.title}</h3>
          <p className="text-xs text-gray-500 whitespace-pre-wrap">{play.product_brief}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            전략 변형 {play.variants.map((v) => v.name).join(' / ') || '없음'} · 전환 인정{' '}
            {play.conversion_window_days}일
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setAddMessage(null);
              setShowAdditionalSearch(true);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded border border-blue-200 text-[11px] text-blue-600 hover:bg-blue-50"
          >
            <Sparkles size={11} /> 추가 타겟 추천
          </button>
          <button
            onClick={() => {
              load();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded border border-gray-200 text-[11px] text-gray-500 hover:bg-gray-50"
          >
            <RefreshCw size={11} /> 새로고침
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 px-2 py-1 rounded border border-gray-200 text-[11px] text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 size={11} /> {deleting ? '삭제 중…' : '삭제'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { label: '타겟', value: funnel.targeted, sub: '' },
          { label: '발송', value: funnel.sent, sub: '' },
          { label: '반응', value: funnel.responded, sub: sentRate(funnel.responded) },
          { label: '재연결', value: funnel.reconnected, sub: sentRate(funnel.reconnected) },
          { label: '전환', value: funnel.converted, sub: sentRate(funnel.converted) },
        ].map((s) => (
          <div key={s.label} className={STAT}>
            <p className="text-[11px] text-gray-500">{s.label}</p>
            <p className="text-lg font-semibold text-gray-900">
              {s.value}
              {s.sub && <span className="ml-1 text-[11px] font-normal text-gray-400">{s.sub}</span>}
            </p>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {addMessage && <p className="text-xs text-green-600">{addMessage}</p>}

      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-white">
          <span className="text-xs">{selected.size}명 선택</span>
          <button
            onClick={() => handleBulk('mark_sent')}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/15 text-[11px] font-medium hover:bg-white/25"
          >
            <Send size={11} /> 발송함으로 기록
          </button>
          <button
            onClick={() => handleBulk('mark_no_response')}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/15 text-[11px] font-medium hover:bg-white/25"
          >
            <MailX size={11} /> 무응답 처리
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-[11px] text-white/60 hover:text-white"
          >
            해제
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white">
        {targets.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">아직 타겟이 없습니다.</p>
        ) : (
          <ul>
            {targets.map((t) => (
              <WinbackTargetRow
                key={t.id}
                target={t}
                variantName={variantName(t.variant_id)}
                checked={selected.has(t.id)}
                onToggle={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(t.id)) next.delete(t.id);
                    else next.add(t.id);
                    return next;
                  })
                }
                onMarkSent={(message) => handleBulk('mark_sent', [t.id], message)}
                onMessageChange={(message) => setMessages((prev) => ({ ...prev, [t.id]: message }))}
                onGenerateDraft={async () => {
                  if (!generateDraft) return;
                  await generateDraft(t.id);
                  await load();
                }}
                onPatch={(patch) => handlePatch(t.id, patch)}
                onStudentClick={onStudentClick}
              />
            ))}
          </ul>
        )}
      </div>

      {showAdditionalSearch && recommend && addTargets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900">추가 타겟 추천</h3>
              </div>
              <button onClick={() => setShowAdditionalSearch(false)} className="text-gray-400 hover:text-gray-600" aria-label="닫기">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="mb-3 text-xs text-gray-500">기존 타겟은 자동으로 제외하고, 새 학생만 검색합니다.</p>
              <RecommendStep
                adminKey=""
                playId={playId}
                draft={playToBriefDraft(play)}
                initialRules={playToRuleDraft(play)}
                autoRun={false}
                addButtonLabel="선택한 명 추가"
                recommend={recommend}
                addTargets={addTargets}
                onDone={async ({ inserted, skipped }) => {
                  await load();
                  setAddMessage(`${inserted.length}명을 추가했습니다.${skipped ? ` 중복 ${skipped}명은 제외했습니다.` : ''}`);
                  setShowAdditionalSearch(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
