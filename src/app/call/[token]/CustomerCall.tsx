'use client';

import { useRef, useState } from 'react';
import type { DailyCall } from '@daily-co/daily-js';
import { Phone, Loader2, Mic } from 'lucide-react';

type Phase = 'consent' | 'connecting' | 'in_call' | 'ended' | 'error';

/**
 * 고객용 통화 UI. 녹음 동의 후 Daily Prebuilt(음성 전용)로 세일즈 담당자와 연결.
 * 고객 토큰은 입장 시점에 GET /api/call/[token]로 발급받는다.
 */
export function CustomerCall({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>('consent');
  const [errorMsg, setErrorMsg] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<DailyCall | null>(null);

  async function join() {
    setPhase('connecting');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/call/${token}`);
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message ?? '통화에 연결할 수 없습니다.');
        setPhase('error');
        return;
      }
      const DailyIframe = (await import('@daily-co/daily-js')).default;
      const existing = DailyIframe.getCallInstance?.();
      if (existing) await existing.destroy();
      if (!wrapRef.current) return;

      const frame = DailyIframe.createFrame(wrapRef.current, {
        showLeaveButton: true,
        iframeStyle: { width: '100%', height: '100%', border: '0' },
      });
      frameRef.current = frame;
      frame.on('left-meeting', () => {
        frame.destroy().catch(() => {});
        frameRef.current = null;
        setPhase('ended');
      });
      await frame.join({ url: json.data.roomUrl, token: json.data.customerToken });
      setPhase('in_call');
    } catch {
      setErrorMsg('통화 연결 중 오류가 발생했습니다. 다시 시도해주세요.');
      setPhase('error');
    }
  }

  if (phase === 'in_call' || phase === 'connecting') {
    return (
      <div className="fixed inset-0 bg-gray-900">
        <div ref={wrapRef} className="w-full h-full" />
        {phase === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center text-white gap-2">
            <Loader2 className="animate-spin" size={20} /> 연결 중…
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-5">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mb-5">
          <Phone className="text-white" size={28} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">SuperfastSAT 상담 통화</h1>

        {phase === 'ended' ? (
          <p className="text-sm text-gray-500 mt-4">통화가 종료되었습니다. 감사합니다.</p>
        ) : phase === 'error' ? (
          <>
            <p className="text-sm text-red-500 mt-4">{errorMsg}</p>
            <button
              onClick={() => setPhase('consent')}
              className="mt-5 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              다시 시도
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              세일즈 담당자와 인터넷 음성 통화를 시작합니다.<br />
              버튼을 누르면 마이크 사용 권한을 허용해주세요.
            </p>
            <div className="mt-5 flex items-start gap-2 text-left bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-3">
              <Mic size={15} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[12px] text-amber-800 leading-relaxed">
                본 상담은 상담 품질 향상을 위해 녹음되며, 통화에 참여하시면 녹음에 동의하시는 것으로
                간주됩니다.
              </p>
            </div>
            <button
              onClick={join}
              className="mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2"
            >
              <Phone size={16} /> 통화 참여
            </button>
          </>
        )}
      </div>
    </div>
  );
}
