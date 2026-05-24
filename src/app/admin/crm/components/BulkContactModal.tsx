'use client';

import { useState } from 'react';
import { X, MessageSquarePlus } from 'lucide-react';

interface BulkContactModalProps {
  studentCount: number;
  adminKey: string;
  studentIds: string[];
  onClose: () => void;
  onSuccess: (updatedCount: number) => void;
}

export function BulkContactModal({
  studentCount,
  adminKey,
  studentIds,
  onClose,
  onSuccess,
}: BulkContactModalProps) {
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!memo.trim()) {
      setError('상담 내용을 입력해주세요.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/crm/students/bulk-memo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ student_ids: studentIds, raw_memo: memo.trim() }),
      });

      const json = await res.json();

      if (!res.ok && res.status !== 207) {
        setError(json.error?.message ?? '저장에 실패했습니다.');
        return;
      }

      onSuccess(json.data.updated as number);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MessageSquarePlus size={15} className="text-blue-500" />
            <h2 className="text-sm font-bold text-gray-900">
              연락 기록 — {studentCount}명
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500">
            선택된 {studentCount}명의 상담 기록(consultation_timeline)에 동일한 메모가 추가됩니다.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              상담 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={memo}
              onChange={(e) => { setMemo(e.target.value); setError(''); }}
              placeholder="오늘 진행한 연락 내용, 학생 반응, 다음 액션 등을 기록하세요"
              rows={5}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

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
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : '상담 기록 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
