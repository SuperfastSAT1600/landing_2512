'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Student, ReactivationEntry } from '@/types/crm';

type Outcome = 'pending' | 'no_response' | 'reactivated' | 'rejected';

const OUTCOME_LABELS: Record<Outcome, string> = {
  pending: '대기 중',
  no_response: '반응 없음',
  reactivated: '재활성화',
  rejected: '거절',
};

const OUTCOME_COLORS: Record<Outcome, string> = {
  pending: 'bg-gray-100 text-gray-600',
  no_response: 'bg-orange-100 text-orange-700',
  reactivated: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

interface SingleModeProps {
  mode: 'single';
  student: Student;
  adminKey: string;
  onClose: () => void;
  onSuccess: (student: Student) => void;
}

interface BulkModeProps {
  mode: 'bulk';
  studentIds: string[];
  adminKey: string;
  onClose: () => void;
  onSuccess: (updatedCount: number) => void;
}

type ReactivationModalProps = SingleModeProps | BulkModeProps;

export function ReactivationModal(props: ReactivationModalProps) {
  const { mode, adminKey, onClose } = props;

  const [strategy, setStrategy] = useState('');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<Outcome>('pending');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingLog: ReactivationEntry[] =
    mode === 'single' ? (props.student.reactivation_log ?? []) : [];

  const isUpdatingExisting = mode === 'single' && selectedEntryId !== null;

  async function handleSubmit() {
    if (!strategy.trim() && !isUpdatingExisting) {
      setError('전략 메모를 입력해주세요.');
      return;
    }
    if (isUpdatingExisting && outcome === 'pending') {
      setError('현재 상태(pending)와 다른 아웃컴을 선택해주세요.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (mode === 'bulk') {
        // 벌크: 신규 pending 항목 일괄 추가
        const res = await fetch('/api/crm/students/bulk-reactivate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey,
          },
          body: JSON.stringify({
            student_ids: props.studentIds,
            strategy: strategy.trim(),
            notes: notes.trim() || undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message ?? '저장에 실패했습니다.');
          return;
        }

        props.onSuccess(json.data.updated as number);
        onClose();
        return;
      }

      // 단일 모드
      if (isUpdatingExisting && selectedEntryId) {
        // 기존 항목 아웃컴 업데이트
        const res = await fetch(`/api/crm/students/${props.student.id}/reactivation`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey,
          },
          body: JSON.stringify({ entry_id: selectedEntryId, outcome }),
        });

        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message ?? '업데이트에 실패했습니다.');
          return;
        }

        // 학생 객체를 재조회해서 부모에게 전달
        const studentRes = await fetch(`/api/crm/students/${props.student.id}`, {
          headers: { 'x-admin-key': adminKey },
        });
        const studentJson = await studentRes.json();
        props.onSuccess(studentJson.data as Student);
        onClose();
        return;
      }

      // 단일 모드: 신규 항목 추가
      const res = await fetch(`/api/crm/students/${props.student.id}/reactivation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          strategy: strategy.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? '저장에 실패했습니다.');
        return;
      }

      // 최신 학생 데이터 조회
      const studentRes = await fetch(`/api/crm/students/${props.student.id}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const studentJson = await studentRes.json();
      props.onSuccess(studentJson.data as Student);
      onClose();
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">
            {mode === 'bulk'
              ? `${props.studentIds.length}명 재활성화 시작`
              : isUpdatingExisting
              ? '연락 결과 업데이트'
              : '재활성화 연락 기록'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 단일 모드: 기존 로그 표시 */}
          {mode === 'single' && existingLog.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">기존 연락 기록</p>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {existingLog.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      if (entry.outcome === 'pending') {
                        setSelectedEntryId(
                          selectedEntryId === entry.id ? null : entry.id
                        );
                      }
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                      selectedEntryId === entry.id
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    } ${entry.outcome !== 'pending' ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-gray-500 text-[11px]">
                        {new Date(entry.attempted_at).toLocaleDateString('ko-KR')}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${OUTCOME_COLORS[entry.outcome]}`}
                      >
                        {OUTCOME_LABELS[entry.outcome]}
                      </span>
                    </div>
                    <p className="text-gray-700 line-clamp-2">{entry.strategy}</p>
                    {entry.outcome === 'pending' && (
                      <p className="text-[10px] text-blue-500 mt-1">
                        클릭하여 결과 업데이트
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 기존 항목 선택 시: 아웃컴 선택 */}
          {isUpdatingExisting && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">연락 결과</p>
              <div className="flex flex-wrap gap-2">
                {(['no_response', 'reactivated', 'rejected'] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOutcome(o)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      outcome === o
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {OUTCOME_LABELS[o]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 신규 항목 추가 시: 전략 입력 */}
          {!isUpdatingExisting && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  전략 메모 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  placeholder="이 학생에게 어떤 방식으로 연락할 계획인지 입력하세요"
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  추가 메모 (선택)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="추가 참고사항을 입력하세요"
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : isUpdatingExisting ? '결과 저장' : '연락 기록 추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
