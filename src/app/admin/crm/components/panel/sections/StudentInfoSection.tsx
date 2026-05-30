'use client';

import { Pencil, Link } from 'lucide-react';
import type { Student } from '@/types/crm';
import { SAT_PAST_MONTHS, formatSatDate } from '../constants';
import { StudentInfoEdit } from './StudentInfoEdit';
import type { EditForm } from '../types';
import type { DiagCandidate } from '../hooks/useDiagnostic';

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
  diagLinked: DiagCandidate | null;
  diagCandidates: DiagCandidate[];
  showDiagPicker: boolean;
  setShowDiagPicker: (v: boolean) => void;
  diagLoading: boolean;
  diagSearchQuery: string;
  setDiagSearchQuery: (v: string) => void;
  onDiagLink: (resultId: string | null) => void;
}

export function StudentInfoSection({
  localStudent, isEditing, setIsEditing, savingEdit, editForm, setEditForm,
  onSaveEdit, onCancelEdit, scoreDisplay,
  diagLinked, diagCandidates, showDiagPicker, setShowDiagPicker,
  diagLoading, diagSearchQuery, setDiagSearchQuery, onDiagLink,
}: Props) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500" style={{ letterSpacing: '0.3px' }}>학생 정보</p>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
          >
            <Pencil size={11} />편집
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={onCancelEdit} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">취소</button>
            <button
              onClick={onSaveEdit}
              disabled={savingEdit}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-colors"
            >
              {savingEdit ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <StudentInfoEdit form={editForm} onChange={setEditForm} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <StudentInfoCell
              label="직전 점수"
              value={scoreDisplay}
              sub={localStudent.previous_score_status === 'scored' && localStudent.previous_test_date
                ? (SAT_PAST_MONTHS.find(m => m.value === localStudent.previous_test_date)?.label ?? localStudent.previous_test_date)
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
            {localStudent.preferred_language && (
              <StudentInfoCell
                label="수업 언어"
                value={{ korean: '한국어', english: 'English', any: '상관없음' }[localStudent.preferred_language] ?? localStudent.preferred_language}
              />
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setShowDiagPicker(!showDiagPicker);
                if (showDiagPicker) { setDiagSearchQuery(''); }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[12px] transition-colors ${
                diagLinked
                  ? 'border-green-200 text-green-600 bg-green-50 hover:bg-green-100'
                  : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Link size={12} />
              {diagLinked ? '진단 결과 연결됨' : '진단테스트 연결'}
            </button>
          </div>

          {showDiagPicker && (
            <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-600">진단테스트 검색</p>
                <button onClick={() => { setShowDiagPicker(false); setDiagSearchQuery(''); }} className="text-[11px] text-gray-400 hover:text-gray-600">닫기</button>
              </div>
              <div className="px-3 py-2 border-b border-gray-100">
                <input
                  autoFocus
                  type="text"
                  value={diagSearchQuery}
                  onChange={e => setDiagSearchQuery(e.target.value)}
                  placeholder="이름 또는 이메일 검색…"
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                />
              </div>
              {diagLoading && (
                <div className="py-4 flex justify-center">
                  <div className="w-4 h-4 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!diagLoading && diagSearchQuery.length < 2 && (
                <p className="text-xs text-gray-400 text-center py-4">이름 또는 이메일로 검색하세요</p>
              )}
              {!diagLoading && diagSearchQuery.length >= 2 && diagCandidates.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">결과 없음</p>
              )}
              {!diagLoading && diagCandidates.map(c => (
                <button
                  key={c.id}
                  onClick={() => onDiagLink(c.id)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 ${diagLinked?.id === c.id ? 'bg-green-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-800">{c.student_name}</p>
                      <p className="text-[11px] text-gray-500">{c.student_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500">
                        {new Date(c.submitted_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </p>
                      {diagLinked?.id === c.id && <p className="text-[10px] text-green-600 font-medium">현재 연결됨</p>}
                    </div>
                  </div>
                </button>
              ))}
              {diagLinked && !diagLoading && (
                <button
                  onClick={() => onDiagLink(null)}
                  className="w-full text-left px-3 py-2 text-[11px] text-red-400 hover:bg-red-50 transition-colors border-t border-gray-100"
                >
                  연결 해제
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
