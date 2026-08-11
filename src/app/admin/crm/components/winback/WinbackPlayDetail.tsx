'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Loader2, RefreshCw, Send, MailX } from 'lucide-react';
import type { WinbackPlayDetailData, WinbackTargetRow as TargetRow } from './hooks/useWinbackPlays';
import { WinbackTargetRow } from './WinbackTargetRow';

interface Props {
  playId: string;
  userName?: string;
  onBack: () => void;
  fetchPlay: (playId: string) => Promise<WinbackPlayDetailData>;
  patchTarget: (targetId: string, patch: Record<string, unknown>) => Promise<TargetRow>;
  bulkTargets: (payload: {
    target_ids: string[];
    action: string;
    author?: string;
  }) => Promise<{ updated: TargetRow[]; failed: { id: string; error: string }[] }>;
  onStudentClick?: (studentId: string) => void;
}

const STAT = 'flex-1 min-w-[92px] bg-white border border-gray-100 rounded-lg px-3 py-2';

export function WinbackPlayDetail({
  playId,
  userName,
  onBack,
  fetchPlay,
  patchTarget,
  bulkTargets,
  onStudentClick,
}: Props) {
  const [play, setPlay] = useState<WinbackPlayDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  async function handleBulk(action: string, targetIds?: string[]) {
    const ids = targetIds ?? [...selected];
    if (ids.length === 0) return;
    try {
      const result = await bulkTargets({ target_ids: ids, action, author: userName });
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
        <p className="text-sm text-red-500">{error ?? '플레이를 불러오지 못했습니다.'}</p>
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
            <ChevronLeft size={13} /> 플레이 목록
          </button>
          <h3 className="mt-1 text-base font-semibold text-gray-900">{play.title}</h3>
          <p className="text-xs text-gray-500 whitespace-pre-wrap">{play.product_brief}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            전략 변형 {play.variants.map((v) => v.name).join(' / ') || '없음'} · 전환 인정{' '}
            {play.conversion_window_days}일
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1 px-2 py-1 rounded border border-gray-200 text-[11px] text-gray-500 hover:bg-gray-50"
        >
          <RefreshCw size={11} /> 새로고침
        </button>
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
                onMarkSent={() => handleBulk('mark_sent', [t.id])}
                onPatch={(patch) => handlePatch(t.id, patch)}
                onStudentClick={onStudentClick}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
