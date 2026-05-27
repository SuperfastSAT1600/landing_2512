'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical, Phone, MessageSquare, CreditCard } from 'lucide-react';
import { Student, SCHOOL_TYPE_LABELS } from '@/types/crm';

interface StudentCardProps {
  student: Student;
  onChurn: () => void;
  onClick: () => void;
  onPayment?: () => void;
  overlay?: boolean;
}

function getDaysSinceContact(lastContactedAt: string | null): number | null {
  if (!lastContactedAt) return null;
  return Math.floor((Date.now() - new Date(lastContactedAt).getTime()) / 86400000);
}

function getDDayLabel(targetTestDate: string | null): string | null {
  if (!targetTestDate) return null;
  const diff = Math.ceil(
    (new Date(targetTestDate).getTime() - Date.now()) / 86400000
  );
  if (diff < 0) return null;
  return `D-${diff}`;
}

export function StudentCard({ student, onChurn, onClick, onPayment, overlay = false }: StudentCardProps) {
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

  const scoreLabel = (() => {
    if (student.previous_score_status === 'never_taken') return '미응시';
    if (student.previous_score_status === 'dont_remember') return '기억안남';
    const rw = student.previous_rw_score;
    const math = student.previous_math_score;
    if (rw !== null && math !== null) return `${rw + math}점`;
    if (rw !== null) return `RW ${rw}`;
    if (math !== null) return `Math ${math}`;
    return '-';
  })();

  const days = getDaysSinceContact(student.last_contacted_at);
  const ddayLabel = getDDayLabel(student.target_test_date);

  // Border color based on days since last contact
  // null = new student with no contact history → neutral gray
  const borderClass = (() => {
    if (days === null) return 'border-gray-200';
    if (days >= 10) return 'border-red-300';
    if (days >= 5) return 'border-amber-300';
    return 'border-gray-200';
  })();

  // Contact time tag
  const contactTag = (() => {
    if (days === null) return { label: '미연락', color: 'text-gray-400' };
    if (days === 0) return { label: '오늘', color: 'text-emerald-500' };
    if (days < 5) return { label: `${days}일 전`, color: 'text-gray-400' };
    if (days < 10) return { label: `${days}일 전`, color: 'text-amber-500' };
    return { label: `${days}일 전`, color: 'text-red-500' };
  })();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative bg-gray-50 border rounded-lg p-3 cursor-pointer
        hover:border-gray-300 transition-all
        ${borderClass}
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

      {/* Churn button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onChurn();
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 text-gray-400 hover:text-red-400 transition-all"
        title="이탈 처리"
      >
        <X size={12} />
      </button>

      {/* Name & Grade */}
      <div className="flex items-start justify-between pr-10 mb-1.5">
        <p className="text-sm font-semibold text-gray-900 leading-tight">{student.name}</p>
        <span className="text-xs text-gray-500 shrink-0 ml-1">{student.grade}</span>
      </div>

      {/* School type */}
      <p className="text-xs text-gray-500 mb-2">
        {SCHOOL_TYPE_LABELS[student.school_type]}
      </p>

      {/* Scores row */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">직전</span>
        <span className="text-gray-600">{scoreLabel}</span>
        {student.target_score && (
          <>
            <span className="text-gray-400">→</span>
            <span className="text-blue-400">{student.target_score}목표</span>
          </>
        )}
      </div>

      {/* Subject tag + contact type icon + D-day */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className={`
          text-[10px] font-bold px-1.5 py-0.5 rounded
          ${student.desired_subjects === 'RW' ? 'bg-purple-500/20 text-purple-300' : ''}
          ${student.desired_subjects === 'Math' ? 'bg-green-500/20 text-green-300' : ''}
          ${student.desired_subjects === 'Both' ? 'bg-blue-500/20 text-blue-300' : ''}
        `}>
          {student.desired_subjects}
        </span>

        {/* Coach status badge */}
        {student.matching_stage === 'matched' && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
            코치배정
          </span>
        )}

        {/* Contact type icon */}
        {student.contact_type === 'kakao' && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-600 flex items-center gap-0.5">
            <MessageSquare size={9} />K
          </span>
        )}
        {student.contact_type === 'phone' && (
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <Phone size={9} />
          </span>
        )}

        {/* D-day */}
        {ddayLabel && (
          <span className="text-[10px] text-blue-400">{ddayLabel}</span>
        )}
      </div>

      {/* Traffic source (if present) */}
      {student.traffic_source && (
        <p className="mt-1 text-[10px] text-gray-400 truncate">{student.traffic_source}</p>
      )}

      {/* Last contacted footer */}
      <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between">
        <span className={`text-[10px] ${contactTag.color}`}>{contactTag.label}</span>
        {onPayment && (
          <button
            onClick={(e) => { e.stopPropagation(); onPayment(); }}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
            title="결제 완료 처리"
          >
            <CreditCard size={10} />
            결제 완료
          </button>
        )}
      </div>
    </div>
  );
}
