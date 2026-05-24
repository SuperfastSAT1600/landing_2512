'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Student, ChurnType, CHURN_TAG_OPTIONS } from '@/types/crm';

interface ChurnModalProps {
  student: Student;
  onConfirm: (churnTag: string, churnType: ChurnType) => void;
  onClose: () => void;
}

export function ChurnModal({ student, onConfirm, onClose }: ChurnModalProps) {
  const [churnTag, setChurnTag] = useState<string>(CHURN_TAG_OPTIONS[0]);
  const [customTag, setCustomTag] = useState('');
  const [churnType, setChurnType] = useState<ChurnType>('potential');
  const [error, setError] = useState('');

  const isCustom = churnTag === '기타';
  const finalTag = isCustom ? customTag.trim() : churnTag;

  function handleConfirm() {
    if (isCustom && !customTag.trim()) {
      setError('이탈 사유를 입력해주세요.');
      return;
    }
    onConfirm(finalTag, churnType);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-gray-50 rounded-xl border border-gray-200 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <h2 className="text-sm font-bold text-gray-900">이탈 처리</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{student.name}</span> 학생을 이탈 처리합니다.
            </p>
            <p className="text-xs text-red-500 mt-1">칸반에서 제거되어 리드풀로 이동합니다.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">이탈 태그</label>
            <select
              value={churnTag}
              onChange={e => { setChurnTag(e.target.value); setError(''); }}
              className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none transition-all"
            >
              {CHURN_TAG_OPTIONS.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {isCustom && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">직접 입력</label>
              <input
                value={customTag}
                onChange={e => { setCustomTag(e.target.value); setError(''); }}
                placeholder="이탈 사유를 입력해주세요"
                className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">이탈 분류</label>
            <div className="flex gap-3">
              {(['potential', 'closed'] as ChurnType[]).map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={type}
                    checked={churnType === type}
                    onChange={() => setChurnType(type)}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-gray-600">
                    {type === 'potential' ? '잠재 복귀 가능' : '완전 종료'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
          >
            이탈 처리
          </button>
        </div>
      </div>
    </div>
  );
}
