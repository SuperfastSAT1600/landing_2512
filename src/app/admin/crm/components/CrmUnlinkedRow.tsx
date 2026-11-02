'use client';

import type { CrmUnlinkedStudent } from '@/app/api/admin/srm/tutoring-users/route';

const BADGE: Record<CrmUnlinkedStudent['reason'], { label: string; className: string }> = {
  no_profile: { label: 'SFv2 미연결', className: 'bg-blue-50 text-blue-600' },
  no_srm_payment: { label: 'SRM 결제 등록 전', className: 'bg-amber-50 text-amber-700' },
};

interface CrmUnlinkedRowProps {
  student: CrmUnlinkedStudent;
  onClick: () => void;
  onLink: () => void;
}

/** 튜터링 목록에 못 들어간 결제 완료 학생 한 줄. 프로필 미연결일 때만 SRM 연결 버튼을 둔다. */
export function CrmUnlinkedRow({ student, onClick, onLink }: CrmUnlinkedRowProps) {
  const badge = BADGE[student.reason];
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3.5 bg-white border border-gray-100 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-gray-900">{student.name}</span>
          {student.grade && <span className="text-xs text-gray-500">{student.grade}</span>}
          <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        {student.parent_phone && (
          <p className="text-xs text-gray-400 mt-0.5">{student.parent_phone}</p>
        )}
      </div>
      {student.reason === 'no_profile' && (
        <div className="shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={onLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            SRM 연결
          </button>
        </div>
      )}
    </div>
  );
}
