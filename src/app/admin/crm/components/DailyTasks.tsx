'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import {
  type Student,
  FUNNEL_STAGE_LABELS,
  FUNNEL_NEXT_ACTION,
  daysInStage,
  isActionDoneToday,
  todaysMemos,
} from '@/types/crm';

interface DailyTasksProps {
  followUpStudents: Student[];
  stalledStudents: Student[];
  // "오늘 취한 액션" 대상 — lead_status 무관하게 오늘 메모/완료체크한 학생 전체
  // (재활성화·이탈 리드풀 포함). 액션 필요 명단(A)과 달리 active로 한정하지 않는다.
  actionedStudents: Student[];
  onStudentClick: (student: Student) => void;
  onStudentUpdate: (id: string, fields: Partial<Student>) => void;
}

type ActionKind = 'stall' | 'followup';

interface ActionItem {
  student: Student;
  kind: ActionKind;
  days: number;
}

export function DailyTasks({
  followUpStudents,
  stalledStudents,
  actionedStudents,
  onStudentClick,
  onStudentUpdate,
}: DailyTasksProps) {
  // 경과 일수 계산 기준 시각 — 마운트 시 1회 캡처 (render 중 Date.now 직접 호출 회피)
  const [nowMs] = useState(() => Date.now());

  // 섹션 A — 오늘 액션 필요 명단 (정체 우선, 같은 학생은 정체로 합침)
  const todoItems = useMemo<ActionItem[]>(() => {
    const map = new Map<string, ActionItem>();
    for (const s of stalledStudents) {
      map.set(s.id, { student: s, kind: 'stall', days: daysInStage(s, nowMs) ?? 0 });
    }
    for (const s of followUpStudents) {
      if (map.has(s.id)) continue;
      const days = s.last_contacted_at
        ? Math.floor((nowMs - new Date(s.last_contacted_at).getTime()) / 86400000)
        : 0;
      map.set(s.id, { student: s, kind: 'followup', days });
    }
    return [...map.values()]
      .filter((it) => !isActionDoneToday(it.student, nowMs))
      .sort((a, b) => b.days - a.days);
  }, [stalledStudents, followUpStudents, nowMs]);

  // 섹션 B — 오늘 취한 액션 (오늘 메모 작성 또는 오늘 완료 체크)
  const doneItems = useMemo(() => {
    return actionedStudents
      .map((s) => ({ student: s, memos: todaysMemos(s, nowMs), checked: isActionDoneToday(s, nowMs) }))
      .filter((x) => x.memos.length > 0 || x.checked)
      .sort((a, b) => {
        const at = a.memos[0]?.created_at ?? a.student.daily_action_done_at ?? '';
        const bt = b.memos[0]?.created_at ?? b.student.daily_action_done_at ?? '';
        return new Date(bt).getTime() - new Date(at).getTime();
      });
  }, [actionedStudents, nowMs]);

  const markDone = (id: string) =>
    onStudentUpdate(id, { daily_action_done_at: new Date().toISOString() });
  const undoDone = (id: string) => onStudentUpdate(id, { daily_action_done_at: null });

  // 메모 작성 시각 — KST 기준 HH:MM (서버 타임존과 무관하게 한국 시간 표기)
  const memoTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* 섹션 A — 오늘 액션 필요 명단 */}
      <div className="border border-gray-100 rounded-lg overflow-hidden self-start">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
          <AlertTriangle size={15} className="text-rose-500 shrink-0" />
          <h3 className="flex-1 text-sm font-semibold text-gray-900">
            오늘 액션 필요 명단
          </h3>
          <span className="text-xs font-semibold text-rose-600">{todoItems.length}명</span>
        </div>
        {todoItems.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            오늘 처리할 액션이 없습니다.
          </p>
        ) : (
          <ol className="divide-y divide-gray-50">
            {todoItems.map(({ student: s, kind, days }, idx) => (
              <li
                key={s.id}
                className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => markDone(s.id)}
                  className="w-4 h-4 shrink-0 rounded border-gray-300 accent-emerald-600 cursor-pointer"
                  aria-label={`${s.name} 액션 완료`}
                  title="처리 완료로 체크하면 명단에서 사라집니다"
                />
                <span className="w-5 shrink-0 text-center text-xs font-semibold text-gray-400">
                  {idx + 1}
                </span>
                <button
                  onClick={() => onStudentClick(s)}
                  className="flex-1 flex items-center justify-between gap-2 text-left min-w-0"
                >
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                        kind === 'stall'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {kind === 'stall' ? `${days}일 정체` : `${days}일 미연락`}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] text-gray-400 truncate">
                      {s.funnel_stage}. {FUNNEL_STAGE_LABELS[s.funnel_stage]}
                    </span>
                    {FUNNEL_NEXT_ACTION[s.funnel_stage] && (
                      <span className="text-[11px] font-medium text-blue-500 shrink-0">
                        → {FUNNEL_NEXT_ACTION[s.funnel_stage]}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* 섹션 B — 오늘 취한 액션 */}
      <div className="border border-gray-100 rounded-lg overflow-hidden self-start">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
          <h3 className="flex-1 text-sm font-semibold text-gray-900">오늘 취한 액션</h3>
          <span className="text-xs font-semibold text-emerald-600">{doneItems.length}명</span>
        </div>
        {doneItems.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            아직 오늘 기록된 액션이 없습니다.
          </p>
        ) : (
          <ol className="divide-y divide-gray-50">
            {doneItems.map(({ student: s, memos, checked }) => (
              <li key={s.id} className="px-5 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => onStudentClick(s)}
                    className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors"
                  >
                    {s.name}
                  </button>
                  {memos.length === 0 && checked && (
                    <button
                      onClick={() => undoDone(s.id)}
                      className="text-[11px] text-gray-400 hover:text-rose-500 transition-colors shrink-0"
                      title="완료 처리 되돌리기"
                    >
                      되돌리기
                    </button>
                  )}
                </div>
                {memos.length > 0 ? (
                  <ul className="mt-1.5 space-y-2.5">
                    {memos.map((m) => (
                      <li key={m.id} className="text-xs">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock size={11} className="text-gray-300 shrink-0" />
                          <span className="text-[11px] text-gray-400">
                            {memoTime(m.created_at)}
                          </span>
                          {m.published ? (
                            <span className="text-[10px] font-medium text-emerald-600">
                              포털 노출 중
                            </span>
                          ) : (
                            m.ai_purified && (
                              <span className="text-[10px] font-medium text-purple-500">
                                AI 변환됨
                              </span>
                            )
                          )}
                        </div>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {m.raw_memo}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-0.5 text-[11px] text-emerald-600">처리 완료 (메모 없음)</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
