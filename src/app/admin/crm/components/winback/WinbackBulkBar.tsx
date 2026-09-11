'use client';

import { useState } from 'react';
import { Send, MailX, Users } from 'lucide-react';

interface Props {
  selectedCount: number;
  /** 선택한 것 중 이미 발송 기록이 있는 수 — 공통 발송은 이들을 덮어쓰지 않는다. */
  alreadySentCount: number;
  /** 같은 문구를 선택한 전원에게 기록한다. */
  onSharedSend: (message: string) => Promise<void> | void;
  /** 기존 동작 — 행마다 따로 입력한 문구로 기록한다. */
  onMarkSent: () => void;
  onMarkNoResponse: () => void;
  onClear: () => void;
}

const ACTION = 'flex items-center gap-1 px-2 py-1 rounded bg-white/15 text-[11px] font-medium hover:bg-white/25';

/**
 * 타겟 다중 선택 바.
 * 같은 문구를 여러 명에게 보내는 일이 잦아, 한 번 입력해 전원에게 기록하는 경로를 둔다.
 * 실제 발송은 담당자가 카톡으로 하고 여기서는 "보냈다"는 사실과 문구만 남긴다.
 */
export function WinbackBulkBar({
  selectedCount,
  alreadySentCount,
  onSharedSend,
  onMarkSent,
  onMarkNoResponse,
  onClear,
}: Props) {
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = message.trim().length > 0 && !sending;

  async function handleSharedSend() {
    if (!canSend) return;
    setSending(true);
    try {
      await onSharedSend(message.trim());
      setMessage('');
      setComposing(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg bg-gray-900 text-white">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-xs">{selectedCount}명 선택</span>
        <button onClick={() => setComposing((v) => !v)} className={ACTION}>
          <Users size={11} /> 공통 문구로 발송 기록
        </button>
        <button onClick={onMarkSent} className={ACTION}>
          <Send size={11} /> 발송함으로 기록
        </button>
        <button onClick={onMarkNoResponse} className={ACTION}>
          <MailX size={11} /> 무응답 처리
        </button>
        <button onClick={onClear} className="ml-auto text-[11px] text-white/60 hover:text-white">
          해제
        </button>
      </div>

      {composing && (
        <div className="space-y-2 border-t border-white/10 px-3 py-2.5">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`${selectedCount}명에게 함께 보낼 문구를 입력하세요`}
            rows={3}
            autoFocus
            className="w-full resize-none rounded-lg bg-white/10 px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:bg-white/15"
          />
          {alreadySentCount > 0 && (
            <p className="text-[11px] text-amber-300">
              이미 발송된 {alreadySentCount}명은 기존 기록을 유지합니다.
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSharedSend}
              disabled={!canSend}
              className="px-2.5 py-1 rounded bg-white text-[11px] font-semibold text-gray-900 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? '기록 중...' : `${selectedCount}명 발송 기록`}
            </button>
            <button
              onClick={() => { setComposing(false); setMessage(''); }}
              className="text-[11px] text-white/60 hover:text-white"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
