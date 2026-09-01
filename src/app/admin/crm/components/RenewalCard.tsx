'use client';

// 재결제 칸반 전용 카드. 공용 StudentCard와 분리한 이유:
// 표시 정보(잔여시간·튜터링 상태·단계 경과일)와 액션(결제/미전환/제외/되돌리기)이 다르고,
// 이 보드의 주 액션은 hover 아이콘이 아니라 상시 노출 라벨 버튼이어야 한다.

import { useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Crown, AlertTriangle } from 'lucide-react';
import { RENEWAL_OPEN_STAGES, type RenewalTarget } from '@/types/crm';
import { getWeekLabel } from '@/lib/week-definitions';
import { TUTORING_STATUS_META, type TutoringDisplayStatus } from './TutoringStudentRow';

export interface RenewalCardTutoring {
  displayStatus: TutoringDisplayStatus;
  /** 부호 있는 잔여 (플랫폼 Payment 페이지의 Remaining). SRM 미연결이면 null. */
  remainingHours: number | null;
  scheduledHours: number | null;
  overscheduledHours: number | null;
}

interface RenewalCardProps {
  target: RenewalTarget;
  /** SRM 튜터링 정보. 미연결이면 null. */
  tutoring: RenewalCardTutoring | null;
  /** 경과일 계산 기준 시각 — 렌더 중 Date.now 직접 호출을 피한다. */
  nowMs: number;
  onClick: () => void;
  onPayment?: () => void;
  onDrop?: () => void;
  onRemove?: () => void;
  onReopen?: () => void;
  /** 카드 메모 저장. 없으면 메모는 읽기 전용으로만 보인다. */
  onMemoSave?: (memo: string) => void;
  /** '진행 중 전체' 스코프에서는 어느 주차 코호트인지 배지로 보여준다. */
  showWeekBadge?: boolean;
  overlay?: boolean;
}

function daysSince(dateStr: string, nowMs: number): number {
  return Math.floor((nowMs - new Date(dateStr).getTime()) / 86400000);
}

function stageAgeTone(days: number): string {
  if (days >= 14) return 'text-red-400';
  if (days >= 7) return 'text-amber-500';
  return 'text-gray-400';
}

export function RenewalCard({
  target,
  tutoring,
  nowMs,
  onClick,
  onPayment,
  onDrop,
  onRemove,
  onReopen,
  onMemoSave,
  showWeekBadge = false,
  overlay = false,
}: RenewalCardProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: target.id,
  });

  // 메모는 비제어로 둔다 — 타이핑마다 카드를 리렌더할 이유가 없고,
  // key로 저장된 값이 바뀔 때만(저장·새로고침) 초안을 서버 값으로 되돌린다.
  const savedMemo = target.memo ?? '';
  const memoRef = useRef<HTMLTextAreaElement>(null);

  const student = target.student;
  const isOpen = RENEWAL_OPEN_STAGES.includes(target.stage);
  const isDropped = target.stage === '5';
  const stageDays = daysSince(target.stage_updated_at, nowMs);
  const meta = tutoring ? TUTORING_STATUS_META[tutoring.displayStatus] : null;

  if (!student) return null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onClick}
      className={`group relative border rounded-lg px-3 py-2 cursor-pointer transition-all ${
        isDragging ? 'opacity-40' : ''
      } ${overlay ? 'shadow-lg bg-white border-gray-300' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-40 hover:!opacity-70 cursor-grab active:cursor-grabbing text-gray-400"
      >
        <GripVertical size={14} />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap pr-5">
        <span className="text-xs font-semibold text-gray-800 min-w-0 truncate">{student.name}</span>
        {student.grade && <span className="text-[10px] text-gray-500">{student.grade}</span>}
        {student.is_vip && (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded font-semibold bg-amber-100 text-amber-700">
            <Crown size={8} />VIP
          </span>
        )}
        {student.needs_attention && (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded font-semibold bg-red-100 text-red-700">
            <AlertTriangle size={8} />주의
          </span>
        )}
        {tutoring?.displayStatus === 'sales' && (
          <span className="text-[10px] px-1 py-0.5 rounded font-semibold bg-blue-100 text-blue-700">
            재결제 필요
          </span>
        )}
      </div>

      {student.parent_phone && (
        <p className="text-[11px] text-gray-400 mt-0.5">{student.parent_phone}</p>
      )}

      {/* 우선순위 신호 — 플랫폼 Payment 페이지의 잔여·예약·초과예약을 그대로 옮긴다 */}
      <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[10px]">
        {tutoring?.remainingHours != null && (
          <span
            className={
              tutoring.remainingHours < 0
                ? 'text-red-600 font-bold'
                : tutoring.remainingHours === 0
                  ? 'text-red-500 font-semibold'
                  : tutoring.remainingHours <= 5
                    ? 'text-amber-600 font-semibold'
                    : 'text-gray-500'
            }
          >
            잔여 {tutoring.remainingHours}h
          </span>
        )}
        {tutoring?.scheduledHours ? (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">예약 {tutoring.scheduledHours}h</span>
          </>
        ) : null}
        {tutoring?.overscheduledHours ? (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-orange-600 font-bold">초과 {tutoring.overscheduledHours}h</span>
          </>
        ) : null}
        {meta && (
          <>
            {tutoring?.remainingHours != null && <span className="text-gray-300">·</span>}
            <span className="text-gray-500">{meta.label}</span>
          </>
        )}
        {(tutoring?.remainingHours != null || meta) && <span className="text-gray-300">·</span>}
        <span className={`font-medium ${stageAgeTone(stageDays)}`}>단계 D+{stageDays}</span>
      </div>

      {isDropped && target.drop_reason && (
        <p className="text-[10px] text-gray-400 mt-1">미전환: {target.drop_reason}</p>
      )}

      {showWeekBadge && (
        <p className="text-[10px] text-gray-400 mt-1">
          {getWeekLabel(target.week_start) ?? target.week_start}
        </p>
      )}

      {/* 액션 — 보드의 주 액션이므로 항상 보인다 */}
      {(onPayment || onDrop || onRemove || onReopen) && !overlay && (
        <div
          className="flex items-center gap-1 mt-2 pt-1.5 border-t border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          {target.stage === '3' && onPayment && (
            <button
              type="button"
              onClick={onPayment}
              className="px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            >
              결제
            </button>
          )}
          {isOpen && onDrop && (
            <button
              type="button"
              onClick={onDrop}
              className="px-2 py-1 rounded-md text-[10px] font-medium text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              미전환
            </button>
          )}
          {isDropped && onReopen && (
            <button
              type="button"
              onClick={onReopen}
              className="px-2 py-1 rounded-md text-[10px] font-medium text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              되돌리기
            </button>
          )}
          {isOpen && onRemove && (
            <button
              type="button"
              onClick={() => (confirmRemove ? onRemove() : setConfirmRemove(true))}
              onBlur={() => setConfirmRemove(false)}
              className={`ml-auto px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                confirmRemove
                  ? 'bg-red-500 text-white hover:bg-red-400'
                  : 'text-gray-400 hover:text-red-500'
              }`}
              title={confirmRemove ? '한 번 더 누르면 삭제됩니다' : '잘못 넣은 대상 삭제'}
            >
              {confirmRemove ? '삭제' : '제외'}
            </button>
          )}
        </div>
      )}

      {/* 카드 메모 — 이 주차 컨택 상태를 보드에서 바로 적는다 */}
      {!overlay &&
        (onMemoSave ? (
          <textarea
            key={savedMemo}
            ref={memoRef}
            rows={2}
            defaultValue={savedMemo}
            placeholder="메모..."
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => {
              const draft = e.target.value.trim();
              if (draft !== savedMemo.trim()) onMemoSave(draft);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') {
                if (memoRef.current) memoRef.current.value = savedMemo;
                memoRef.current?.blur();
              }
            }}
            className="mt-2 w-full resize-none rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[11px] leading-snug text-gray-700 placeholder:text-gray-300 outline-none transition-colors focus:border-gray-400"
          />
        ) : (
          savedMemo && (
            <p className="mt-2 whitespace-pre-wrap rounded-md bg-white/70 px-2 py-1.5 text-[11px] leading-snug text-gray-600">
              {savedMemo}
            </p>
          )
        ))}
    </div>
  );
}
