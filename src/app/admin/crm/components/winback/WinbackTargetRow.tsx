'use client';

import { useState } from 'react';
import { Copy, Send, Check, PhoneCall, X } from 'lucide-react';
import type { WinbackResponse } from '@/types/crm';
import type { WinbackTargetRow as TargetRow } from './hooks/useWinbackPlays';

interface Props {
  target: TargetRow;
  variantName: string;
  checked: boolean;
  onToggle: () => void;
  onMarkSent: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
  onStudentClick?: (studentId: string) => void;
}

const RESPONSE_LABELS: Record<WinbackResponse, string> = {
  positive: '긍정',
  later: '보류',
  negative: '거절',
  none: '무응답',
};

const RESPONSE_STYLES: Record<WinbackResponse, string> = {
  positive: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  later: 'bg-amber-100 text-amber-700 border-amber-200',
  negative: 'bg-red-100 text-red-700 border-red-200',
  none: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function WinbackTargetRow({
  target,
  variantName,
  checked,
  onToggle,
  onMarkSent,
  onPatch,
  onStudentClick,
}: Props) {
  const [copied, setCopied] = useState(false);
  const name = target.student?.name ?? '(삭제된 학생)';

  async function copyMessage() {
    if (!target.message_draft) return;
    await navigator.clipboard.writeText(target.message_draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <li className="border-b border-gray-50 last:border-0 px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 accent-gray-900" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => target.student && onStudentClick?.(target.student.id)}
              className="text-sm font-medium text-gray-900 hover:underline"
            >
              {name}
            </button>
            <span className="text-[11px] text-gray-400">{target.student?.grade}</span>
            {/* 리드풀에서 손으로 담은 타겟은 점수가 없다(0) — "0점"으로 오해되게 표시하지 않는다. */}
            {target.score != null && target.score > 0 && (
              <span className="text-[11px] text-gray-500">{Math.round(target.score)}점</span>
            )}
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{variantName}</span>
            {target.sent_at ? (
              <span className="text-[11px] text-blue-600">
                발송 {target.sent_at.slice(0, 10)}
                {target.sent_by ? ` · ${target.sent_by}` : ''}
              </span>
            ) : (
              <span className="text-[11px] text-gray-300">미발송</span>
            )}
            {target.reconnected_at && (
              <span className="text-[11px] text-indigo-600">재연결 {target.reconnected_at.slice(0, 10)}</span>
            )}
            {target.converted_at && (
              <span className="text-[11px] font-semibold text-emerald-600">
                결제 전환{target.conversion_amount ? ` ${Math.round(target.conversion_amount / 10000)}만원` : ''}
              </span>
            )}
          </div>

          {target.reason && <p className="mt-0.5 text-[11px] text-gray-500">{target.reason}</p>}

          {target.message_draft && (
            <p className="mt-1 text-[11px] text-gray-600 bg-gray-50 rounded p-1.5 whitespace-pre-wrap line-clamp-3">
              {target.message_draft}
            </p>
          )}

          {/* 액션 — 발송은 담당자가 카톡에서 하고, 여기서는 사실만 기록한다 */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {target.message_draft && (
              <button
                type="button"
                onClick={copyMessage}
                className="flex items-center gap-1 px-2 py-1 rounded border border-gray-200 text-[11px] text-gray-600 hover:bg-gray-50"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? '복사됨' : '문구 복사'}
              </button>
            )}
            {!target.sent_at && (
              <button
                type="button"
                onClick={onMarkSent}
                className="flex items-center gap-1 px-2 py-1 rounded bg-gray-900 text-white text-[11px] font-medium hover:bg-gray-700"
              >
                <Send size={11} /> 발송함
              </button>
            )}

            {target.sent_at && (
              <>
                <span className="text-[11px] text-gray-400 ml-1">반응</span>
                {(Object.keys(RESPONSE_LABELS) as WinbackResponse[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onPatch({ response: r })}
                    className={`px-1.5 py-0.5 text-[11px] rounded border transition-colors ${
                      target.response === r
                        ? RESPONSE_STYLES[r]
                        : 'border-gray-200 text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    {RESPONSE_LABELS[r]}
                  </button>
                ))}
                {!target.reconnected_at && (
                  <button
                    type="button"
                    onClick={() => onPatch({ reconnected_at: new Date().toISOString() })}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] rounded border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
                  >
                    <PhoneCall size={10} /> 상담 재연결
                  </button>
                )}
              </>
            )}

            {target.status !== 'skipped' && !target.sent_at && (
              <button
                type="button"
                onClick={() => onPatch({ status: 'skipped' })}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-gray-400 hover:text-red-500"
              >
                <X size={10} /> 제외
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
