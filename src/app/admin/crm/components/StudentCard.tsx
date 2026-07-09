'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical, CreditCard, MessageSquare, UserCheck } from 'lucide-react';
import { Student } from '@/types/crm';

function daysElapsed(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

interface StudentCardProps {
  student: Student;
  onChurn: () => void;
  onClick: () => void;
  onPayment?: () => void;
  overlay?: boolean;
  /** 현재 단계 SLA를 초과해 정체된 일수. null이면 정체 아님(뱃지 미표시). */
  stalledDays?: number | null;
  /** 8번(결제완료) 컬럼 모드 — 회원가입 확인 체크 + 단톡방 개설 버튼 노출, 이탈/결제 버튼 숨김. */
  enrollmentMode?: boolean;
  onToggleSignup?: () => void;
  onKakaoCreate?: () => void;
}


export function StudentCard({ student, onChurn, onClick, onPayment, overlay = false, stalledDays = null, enrollmentMode = false, onToggleSignup, onKakaoCreate }: StudentCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: student.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };


  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative border rounded-lg px-3 py-2 cursor-pointer transition-all
        ${stalledDays !== null ? 'bg-rose-50 border-rose-300 hover:border-rose-400' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}
        ${isDragging ? 'opacity-50 ring-2 ring-blue-500' : ''}
        ${overlay ? 'shadow-2xl ring-2 ring-blue-500 rotate-1' : ''}
      `}
      onClick={onClick}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-7 opacity-0 group-hover:opacity-40 hover:!opacity-80 cursor-grab active:cursor-grabbing p-0.5 text-gray-400"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </div>

      {/* Churn button (결제완료 단계에선 숨김) */}
      {!enrollmentMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onChurn(); }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 text-gray-400 hover:text-red-400 transition-all"
          title="이탈 처리"
        >
          <X size={12} />
        </button>
      )}

      {/* Name */}
      <p className="text-sm font-semibold text-gray-900 leading-tight pr-10">{student.name}</p>

      {/* Phone */}
      {student.parent_phone && (
        <p className="text-[11px] text-gray-400 mt-0.5">{student.parent_phone}</p>
      )}

      {/* 인입 채널 · 유입 소스 (하나로 합쳐 표시) */}
      {(student.inquiry_channel || student.traffic_source) && (
        <div className="mt-1">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-sky-700 bg-sky-50 border border-sky-100">
            {[student.inquiry_channel, student.traffic_source].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}

      {/* Stage-stall badge — SLA 초과 시 다음 단계로 진행 촉구 */}
      {stalledDays !== null && (
        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          {stalledDays}일 정체
        </span>
      )}

      {/* Days elapsed + payment icon */}
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {(() => {
            const days = daysElapsed(student.inquiry_date ?? student.created_at);
            return days !== null ? (
              <span className={`text-[10px] font-medium shrink-0 ${days >= 14 ? 'text-red-400' : days >= 7 ? 'text-amber-500' : 'text-gray-400'}`}>
                D+{days}
              </span>
            ) : null;
          })()}
        </div>
        {onPayment && (
          <button
            onClick={(e) => { e.stopPropagation(); onPayment(); }}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 text-blue-400 hover:text-blue-600 transition-all shrink-0"
            title="결제 완료 처리"
          >
            <CreditCard size={12} />
          </button>
        )}
      </div>

      {/* 결제완료(8번) 온보딩: 회원가입 확인 → 단톡방 개설(완료 시 칸반에서 제거) */}
      {enrollmentMode && (
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!student.signup_done_at}
              onChange={(e) => { e.stopPropagation(); onToggleSignup?.(); }}
              className="w-3.5 h-3.5 rounded border-gray-300 accent-emerald-600 cursor-pointer"
            />
            <UserCheck size={11} className="text-emerald-500" />
            회원가입 확인
          </label>
          <button
            onClick={(e) => { e.stopPropagation(); onKakaoCreate?.(); }}
            disabled={!student.signup_done_at}
            className="w-full flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-semibold transition-colors bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
            title={student.signup_done_at ? '단톡방 개설 완료 → 칸반에서 제거' : '회원가입 확인 후 가능'}
          >
            <MessageSquare size={11} />
            단톡방 개설
          </button>
        </div>
      )}
    </div>
  );
}
