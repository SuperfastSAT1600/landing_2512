'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical, CreditCard } from 'lucide-react';
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


  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer
        hover:border-gray-300 transition-all
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
        onClick={(e) => { e.stopPropagation(); onChurn(); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 text-gray-400 hover:text-red-400 transition-all"
        title="이탈 처리"
      >
        <X size={12} />
      </button>

      {/* Name */}
      <p className="text-sm font-semibold text-gray-900 leading-tight pr-10">{student.name}</p>

      {/* Phone */}
      {student.parent_phone && (
        <p className="text-[11px] text-gray-400 mt-0.5">{student.parent_phone}</p>
      )}

      {/* Days elapsed + payment icon */}
      <div className="mt-1.5 flex items-center justify-between">
        {(() => {
          const days = daysElapsed(student.inquiry_date ?? student.created_at);
          return days !== null ? (
            <span className={`text-[10px] font-medium ${days >= 14 ? 'text-red-400' : days >= 7 ? 'text-amber-500' : 'text-gray-400'}`}>
              D+{days}
            </span>
          ) : <span />;
        })()}
        {onPayment && (
          <button
            onClick={(e) => { e.stopPropagation(); onPayment(); }}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 text-blue-400 hover:text-blue-600 transition-all"
            title="결제 완료 처리"
          >
            <CreditCard size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
