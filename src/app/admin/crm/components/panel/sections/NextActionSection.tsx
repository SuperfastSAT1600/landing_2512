'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import type { Student } from '@/types/crm';
import { SectionCard } from './SectionCard';

interface Props {
  student: Student;
  adminKey: string;
}

interface NextAction {
  summary: string;
  recommended_action: string;
  draft_message: string;
}

export function NextActionSection({ student, adminKey }: Props) {
  const [result, setResult] = useState<NextAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/crm/students/${student.id}/next-action`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (res.ok && json.data) setResult(json.data as NextAction);
      else setError(json.error?.message ?? '생성에 실패했습니다.');
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function copyDraft() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.draft_message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  return (
    <SectionCard title="AI 다음 액션" defaultOpen={false}>
      {!result && !loading && (
        <button
          onClick={generate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
        >
          <Sparkles size={13} /> 다음 액션 제안받기
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
          <Loader2 size={15} className="animate-spin" /> 분석 중…
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-red-500 py-2">{error} <button onClick={generate} className="underline ml-1">다시</button></p>
      )}

      {result && !loading && (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold text-gray-400 mb-1">상황 요약</p>
            <p className="text-[13px] text-gray-700 whitespace-pre-wrap">{result.summary}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-400 mb-1">추천 다음 액션</p>
            <p className="text-[13px] font-medium text-gray-900">{result.recommended_action}</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-semibold text-gray-400">메시지 초안</p>
              <button onClick={copyDraft} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-600">
                {copied ? <><Check size={11} /> 복사됨</> : <><Copy size={11} /> 복사</>}
              </button>
            </div>
            <p className="text-[13px] text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-2.5 border border-gray-100">{result.draft_message}</p>
          </div>
          <button onClick={generate} className="text-[11px] text-gray-400 hover:text-gray-600">다시 생성</button>
        </div>
      )}
    </SectionCard>
  );
}
