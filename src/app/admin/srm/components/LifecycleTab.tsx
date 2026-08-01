'use client';
import { srmFetch } from '../lib/srm-fetch';

import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import type { LifecycleResponse } from '@/app/api/admin/srm/lifecycle/route';
import { STAGE_LABELS, type SrmStage } from '@/app/admin/srm/lifecycle-constants';

const ORDERED_STAGES: SrmStage[] = [
  'onboarding_coach',
  'onboarding_first_class',
  'onboarding_studyhall',
  'onboarding_prep',
  'active',
  'cycle_next_class',
  'cycle_studyhall',
  'cycle_active',
];

const ALL_STAGES: SrmStage[] = [
  ...ORDERED_STAGES,
  'renewal_pending',
  'churned',
];

interface Props {
  profileId: string;
  studentId?: string;
}

export function LifecycleTab({ profileId, studentId }: Props) {
  const [data, setData] = useState<LifecycleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [setStage, setSetStage] = useState<SrmStage | ''>('');

  const qp = studentId ? `studentId=${studentId}` : `profileId=${profileId}`;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await srmFetch(`/api/admin/srm/lifecycle?${qp}`);
      setData(await res.json());
      setLoading(false);
    };
    fetchData();
  }, [qp]);

  const handleComplete = async () => {
    if (!data?.current || acting) return;
    setActing(true);
    await srmFetch('/api/admin/srm/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: studentId ? undefined : profileId,
        studentId: studentId ?? undefined,
        stage: data.current.stage,
        action: 'complete',
        dueDate: dueDate || undefined,
        note: note || undefined,
      }),
    });
    setNote('');
    setDueDate('');
    await fetchData();
    setActing(false);
  };

  const handleSet = async () => {
    if (!setStage || acting) return;
    setActing(true);
    await srmFetch('/api/admin/srm/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: studentId ? undefined : profileId,
        studentId: studentId ?? undefined,
        stage: setStage,
        action: 'set',
        dueDate: dueDate || undefined,
      }),
    });
    setSetStage('');
    setDueDate('');
    await fetchData();
    setActing(false);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />)}
      </div>
    );
  }

  const current = data?.current ?? null;
  const completedStages = new Set(
    (data?.history ?? []).filter((s) => s.completed_at).map((s) => s.stage)
  );
  const completedCount = (data?.history ?? []).filter((s) => s.completed_at).length;
  const totalCount = data?.history?.length ?? 0;

  return (
    <div className="space-y-5">
      {/* 현재 단계 */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-xs text-blue-700 font-semibold mb-1">현재 단계</p>
        {current ? (
          <>
            <p className="text-sm text-gray-900 font-medium">{STAGE_LABELS[current.stage]}</p>
            {current.due_date && (
              <p className="text-xs text-gray-500 mt-0.5">목표일: {current.due_date}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">라이프사이클 미설정</p>
        )}
        <p className="text-xs text-gray-600 mt-1">완료 {completedCount} / 전체 {totalCount} 단계</p>
      </div>

      {/* 단계 진행 목록 */}
      <div className="space-y-1">
        {ORDERED_STAGES.map((stage) => {
          const isDone = completedStages.has(stage);
          const isCurrent = current?.stage === stage;
          return (
            <div
              key={stage}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                isCurrent ? 'bg-blue-500/10 text-gray-900' : isDone ? 'text-gray-600' : 'text-gray-500'
              }`}
            >
              <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                {isDone ? (
                  <Check size={13} className="text-green-500" />
                ) : isCurrent ? (
                  <ChevronRight size={13} className="text-blue-700" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                )}
              </div>
              <span>{STAGE_LABELS[stage]}</span>
            </div>
          );
        })}
      </div>

      {/* 액션 영역 */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        {/* 완료 처리 */}
        {current && (
          <div className="space-y-2">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="완료 메모 (선택)"
              className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-500"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="다음 단계 목표일"
              className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500"
            />
            <button
              onClick={handleComplete}
              disabled={acting}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-gray-900 text-sm font-medium rounded-md transition-colors"
            >
              {acting ? '처리 중...' : `"${STAGE_LABELS[current.stage]}" 완료 처리`}
            </button>
          </div>
        )}

        {/* 단계 직접 설정 */}
        <div className="space-y-2">
          <select
            value={setStage}
            onChange={(e) => setSetStage(e.target.value as SrmStage | '')}
            className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 "
          >
            <option value="" className="bg-white text-gray-700">단계 직접 설정...</option>
            {ALL_STAGES.map((s) => (
              <option key={s} value={s} className="bg-white text-gray-700">{STAGE_LABELS[s]}</option>
            ))}
          </select>
          {setStage && (
            <button
              onClick={handleSet}
              disabled={acting}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-900 text-sm font-medium rounded-md transition-colors"
            >
              {acting ? '설정 중...' : '단계 설정'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
