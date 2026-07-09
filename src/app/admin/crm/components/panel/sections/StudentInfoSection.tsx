'use client';

import { Pencil, Crown } from 'lucide-react';
import type { Student } from '@/types/crm';
import { SCHOOL_TYPE_LABELS, TIMEZONE_OPTIONS } from '@/types/crm';
import { formatSatMonth, formatSatDate } from '../constants';
import { StudentInfoEdit } from './StudentInfoEdit';
import type { EditForm } from '../types';
import { SectionCard } from './SectionCard';

const CONTACT_TYPE_LABELS: Record<string, string> = {
  phone: '핸드폰',
  kakao: '카카오톡',
  email: '이메일',
};

const LANGUAGE_LABELS: Record<string, string> = {
  korean: '한국어',
  english: 'English',
  any: '한/영 혼용',
};

function StudentInfoCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p className="text-[14px] text-gray-900 font-bold leading-snug">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

interface Props {
  localStudent: Student;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  savingEdit: boolean;
  editForm: EditForm;
  setEditForm: (f: EditForm) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  scoreDisplay: string;
  adminKey?: string;
  onVipToggle: () => void;
  vipToggling?: boolean;
}

export function StudentInfoSection({
  localStudent, isEditing, setIsEditing, savingEdit, editForm, setEditForm,
  onSaveEdit, onCancelEdit, scoreDisplay, adminKey,
  onVipToggle, vipToggling,
}: Props) {
  const actions = !isEditing ? (
    <button
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
    >
      <Pencil size={11} />편집
    </button>
  ) : (
    <>
      <button onClick={onCancelEdit} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">취소</button>
      <button
        onClick={onSaveEdit}
        disabled={savingEdit}
        className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-colors"
      >
        {savingEdit ? '저장 중...' : '저장'}
      </button>
    </>
  );

  return (
    <SectionCard title="학생 정보" defaultOpen={false} actions={actions}>
      {isEditing ? (
        <StudentInfoEdit form={editForm} onChange={setEditForm} adminKey={adminKey} studentId={localStudent.id} />
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <StudentInfoCell
              label="학년"
              value={localStudent.grade || '—'}
              sub={SCHOOL_TYPE_LABELS[localStudent.school_type]}
            />
            <StudentInfoCell
              label="희망 과목"
              value={localStudent.desired_subjects || '—'}
            />
            <StudentInfoCell
              label="연락 수단"
              value={CONTACT_TYPE_LABELS[localStudent.contact_type ?? ''] ?? '—'}
            />
            <StudentInfoCell
              label="연락처"
              value={localStudent.parent_phone || '—'}
            />
            {localStudent.parent_timezone && (
              <StudentInfoCell
                label="거주 시간대"
                value={TIMEZONE_OPTIONS.find(o => o.value === localStudent.parent_timezone)?.label ?? localStudent.parent_timezone}
              />
            )}
            {localStudent.preferred_language && (
              <StudentInfoCell
                label="수업 언어"
                value={LANGUAGE_LABELS[localStudent.preferred_language] ?? localStudent.preferred_language}
              />
            )}
            <StudentInfoCell
              label="직전 점수"
              value={scoreDisplay}
              sub={localStudent.previous_score_status === 'scored' && localStudent.previous_test_date
                ? formatSatMonth(localStudent.previous_test_date)
                : undefined}
            />
            <StudentInfoCell
              label="1차 목표"
              value={localStudent.target_test_date ? formatSatDate(localStudent.target_test_date) : '미정'}
              sub={localStudent.target_score ? `${localStudent.target_score}점` : undefined}
            />
            {(localStudent.target_test_date_2 || localStudent.target_score_2) && (
              <StudentInfoCell
                label="2차 목표"
                value={localStudent.target_test_date_2 ? formatSatDate(localStudent.target_test_date_2) : '미정'}
                sub={localStudent.target_score_2 ? `${localStudent.target_score_2}점` : undefined}
              />
            )}
            {localStudent.entered_by && (
              <StudentInfoCell label="입력자" value={localStudent.entered_by} />
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <button
              onClick={onVipToggle}
              disabled={vipToggling}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 ${
                localStudent.is_vip
                  ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
              }`}
            >
              <Crown size={12} className={localStudent.is_vip ? 'text-amber-500' : 'text-gray-300'} />
              <span className={localStudent.is_vip ? 'text-amber-700' : 'text-gray-400'}>VIP 학생</span>
              <span className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors duration-200 ${localStudent.is_vip ? 'bg-amber-400' : 'bg-gray-200'}`}>
                <span className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm mt-0.5 transition-transform duration-200 ${localStudent.is_vip ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </span>
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
