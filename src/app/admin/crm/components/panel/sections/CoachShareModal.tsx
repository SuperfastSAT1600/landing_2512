'use client';

import { useState } from 'react';
import { X, BookOpen } from 'lucide-react';
import type { ConsultationEntry } from '@/types/crm';

interface Props {
  entry: ConsultationEntry;
  saving: boolean;
  onSave: (content: string, visible: boolean) => void;
  onClose: () => void;
}

export function CoachShareModal({ entry, saving, onSave, onClose }: Props) {
  const [visible, setVisible] = useState(entry.coach_visible ?? false);
  const [content, setContent] = useState(
    entry.ai_coach_history?.trim() || entry.raw_memo || ''
  );

  const date = new Date(entry.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-violet-500" />
            <h2 className="text-sm font-semibold text-gray-900">코치 준비 자료 공유 설정</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={15} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* 원본 메모 컨텍스트 */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              {date} 상담 메모 원본
            </p>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-4">
              {entry.raw_memo || '(내용 없음)'}
            </p>
          </div>

          {/* 코치 공유 토글 */}
          <div
            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
              visible
                ? 'bg-violet-50 border-violet-200'
                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setVisible(!visible)}
          >
            <div>
              <p className={`text-sm font-semibold ${visible ? 'text-violet-700' : 'text-gray-700'}`}>
                코치 준비 자료에 표시
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {visible ? '코치 준비 페이지에 이 내용이 표시됩니다.' : '비활성화 상태 — 코치에게 보이지 않습니다.'}
              </p>
            </div>
            <div
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                visible ? 'bg-violet-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  visible ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </div>
          </div>

          {/* 코치용 내용 편집 */}
          {visible && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                코치에게 보여줄 내용
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="코치가 수업 전에 알아야 할 내용을 입력하세요..."
                className="w-full text-sm text-gray-800 border border-gray-200 rounded-xl px-3.5 py-3 resize-y focus:outline-none focus:border-violet-400 transition-colors leading-relaxed"
              />
              <p className="text-[11px] text-gray-400">
                원본 메모 또는 AI 요약본이 기본으로 채워집니다. 코치에게 전달할 내용으로 자유롭게 수정하세요.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => onSave(content, visible)}
            disabled={saving || (visible && !content.trim())}
            className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
