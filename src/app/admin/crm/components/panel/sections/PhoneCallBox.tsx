'use client';

import { Phone, Loader2, Copy, Check, ExternalLink, CheckCircle2, RotateCw, RefreshCw } from 'lucide-react';
import type { PhoneCall } from '../hooks/usePhoneCall';

/**
 * 인터넷 전화 UI. "통화 연결" → 링크 2개(세일즈 담당자 입장용 / 고객 전달용) 제공.
 * 즉시 통화창을 열지 않고 링크만 만들어, 세일즈 담당자·고객이 각자 링크로 접속하면 통화가 시작된다.
 * (세일즈 담당자가 모바일로 자기 링크에 접속해 통화하는 경우도 지원)
 */
export function PhoneCallBox({ phone }: { phone: PhoneCall }) {
  const { status, repRoomUrl, customerLink, copied, callError } = phone;

  if (status === 'idle' || status === 'creating') {
    return (
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={phone.startCall}
            disabled={status === 'creating'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-40 border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            {status === 'creating' ? (
              <><Loader2 size={13} className="animate-spin" /> 통화방 생성 중…</>
            ) : (
              <><Phone size={13} /> 통화 연결</>
            )}
          </button>
          <span className="text-[11px] text-gray-400">링크를 만들어 고객에게 전달하면 통화가 시작돼요</span>
        </div>
        {callError && <p className="mt-1 text-xs text-red-500">{callError}</p>}
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-2.5">
      {/* 세일즈 담당자 입장 링크 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-gray-600">📱 내 입장 링크 (세일즈 담당자)</span>
          <span className="text-[10px] text-gray-400">열면 녹음 자동 시작</span>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            readOnly
            value={repRoomUrl}
            className="flex-1 bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-600 truncate"
          />
          <button
            onClick={phone.openRepLink}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-900 hover:bg-gray-700 text-white text-[11px] font-semibold shrink-0"
          >
            <ExternalLink size={11} /> 열기
          </button>
          <button
            onClick={() => phone.copyLink('rep')}
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 text-[11px] font-semibold shrink-0"
          >
            {copied === 'rep' ? <Check size={11} /> : <Copy size={11} />}
          </button>
        </div>
      </div>

      {/* 고객 전달 링크 */}
      <div>
        <span className="text-[11px] font-semibold text-blue-700">🔗 고객 링크 (전달용)</span>
        <div className="flex items-center gap-1.5 mt-1">
          <input
            readOnly
            value={customerLink}
            className="flex-1 bg-white border border-blue-200 rounded-md px-2 py-1 text-[11px] text-gray-700 truncate"
          />
          <button
            onClick={() => phone.copyLink('customer')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold shrink-0"
          >
            {copied === 'customer' ? <><Check size={11} /> 복사됨</> : <><Copy size={11} /> 복사</>}
          </button>
        </div>
      </div>

      {/* 상태 라인 */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="text-[11px]">
          {status === 'ready' && (
            <span className="text-gray-500">통화가 끝나면 요약이 타임라인에 자동 추가돼요</span>
          )}
          {status === 'processing' && (
            <span className="flex items-center gap-1 text-blue-600">
              <Loader2 size={11} className="animate-spin" /> 통화 요약 생성 중…
            </span>
          )}
          {status === 'done' && (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 size={12} /> 요약이 타임라인에 추가됐어요
            </span>
          )}
          {status === 'failed' && (
            <button
              onClick={phone.retry}
              className="flex items-center gap-1 text-rose-500 hover:text-rose-600"
            >
              <RotateCw size={11} /> 요약 재시도
            </button>
          )}
        </div>
        <button
          onClick={phone.reset}
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600"
        >
          <RefreshCw size={10} /> 새 통화
        </button>
      </div>
      {callError && <p className="text-xs text-red-500">{callError}</p>}
    </div>
  );
}
