'use client';

import { useCallback, useEffect, useState } from 'react';
import { reasonLabel } from '@/lib/contact-tasks';
import type { DraftResult } from '../api';

interface Props {
  /** 기록할 때 고르는 용건. 하나면 고르지 않는다 */
  purposes: string[];
  onGenerate: () => Promise<DraftResult>;
  /** 실제 보낸 내용을 연락 기록과 초안에 남긴다 */
  onSend: (purpose: string, text: string, draftId: string) => Promise<void>;
}

/** 에이전트가 만든 메시지 초안. 열면 바로 만들고, 근무자가 고쳐 복사해 보낸 뒤 보낸 내용을 기록한다 */
export function MessageDraftPanel({ purposes, onGenerate, onSend }: Props) {
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [text, setText] = useState('');
  const [purpose, setPurpose] = useState(purposes[0]);
  const [state, setState] = useState<'idle' | 'generating' | 'sending' | 'sent'>('generating');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => onGenerate()
    .then(d => { setDraft(d); setText(d.message); setError(null); })
    .catch((e: unknown) => setError(e instanceof Error ? e.message : '초안을 만들지 못했습니다.'))
    .finally(() => setState('idle')), [onGenerate]);

  // 처음 열 때 한 번만 만든다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  function regenerate() {
    setState('generating');
    setError(null);
    void load();
  }

  async function send() {
    if (!draft) return;
    setState('sending');
    setError(null);
    try {
      await onSend(purpose, text.trim(), draft.id);
      setState('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : '기록하지 못했습니다.');
      setState('idle');
    }
  }

  const btn = 'rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40';
  return (
    <div className="mt-2 space-y-2 rounded bg-blue-50/60 p-2">
      {state === 'generating' && <p className="text-xs text-gray-600">연락 이력과 용건을 읽고 초안을 쓰는 중…</p>}
      {!draft && state === 'idle' && <button type="button" onClick={regenerate} className="rounded border border-gray-300 px-2 py-1 text-xs">다시 시도</button>}
      {draft && (
        <>
          {draft.handoff && <p role="alert" className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">{`직원 확인 필요: ${draft.handoff}`}</p>}
          <textarea aria-label="보낼 메시지" value={text} onChange={e => setText(e.target.value)} rows={5} maxLength={900}
            disabled={state === 'sent'} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm" />
          {draft.basis.length > 0 && (
            <ul className="list-disc pl-4 text-[11px] text-gray-500">{draft.basis.map(b => <li key={b}>{b}</li>)}</ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void navigator.clipboard?.writeText(text)} className={btn}>복사</button>
            {purposes.length > 1 && (
              <select aria-label="기록할 용건" value={purpose} onChange={e => setPurpose(e.target.value)} disabled={state === 'sent'}
                className="rounded border border-gray-300 px-1 py-1 text-xs">
                {purposes.map(p => <option key={p} value={p}>{reasonLabel(p)}</option>)}
              </select>
            )}
            <button type="button" onClick={() => void send()} disabled={state !== 'idle' || !text.trim()}
              className="rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-40">
              {state === 'sent' ? '기록됨' : '보낸 내용으로 기록'}
            </button>
            <button type="button" onClick={regenerate} disabled={state !== 'idle'} className={`${btn} ml-auto`}>다시 만들기</button>
          </div>
        </>
      )}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

