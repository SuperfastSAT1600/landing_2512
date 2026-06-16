'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Params {
  studentId: string;
  adminKey: string;
}

export type CallStatus = 'idle' | 'creating' | 'ready' | 'processing' | 'done' | 'failed';
export type CopiedField = 'rep' | 'customer' | null;

/** usePhoneCall 반환 타입 (MemoSection 등에 통째로 전달). */
export type PhoneCall = ReturnType<typeof usePhoneCall>;

/**
 * 브라우저 인터넷 전화(VoIP) 통화 제어.
 * "통화 연결" → Daily 방 생성 → 링크 2개 제공:
 *   1) 세일즈 담당자 본인 입장 링크(열면 녹음 자동 시작) — 데스크톱/모바일에서 접속
 *   2) 고객 전달용 링크 — 복사해서 고객에게 전송
 * 세일즈 담당자·고객이 각자 링크로 접속하면 통화가 시작되고, 종료 후 녹음 전사·요약이
 * 끝나면(웹훅) 메모가 타임라인에 자동 추가된다(realtime).
 */
export function usePhoneCall({ studentId, adminKey }: Params) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [callId, setCallId] = useState<string | null>(null);
  const [repRoomUrl, setRepRoomUrl] = useState<string>('');
  const [customerLink, setCustomerLink] = useState<string>('');
  const [copied, setCopied] = useState<CopiedField>(null);
  const [callError, setCallError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      stopPolling();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [stopPolling]
  );

  // 세션 상태 폴링 — 통화 종료 후 녹음 전사·요약 진행 상황을 라벨로 표시.
  // (메모 자체는 완료 시 realtime으로 타임라인에 표시되므로 폴링은 라벨 용도)
  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      let elapsed = 0;
      pollRef.current = setInterval(async () => {
        elapsed += 8;
        try {
          const res = await fetch(`/api/crm/students/${studentId}/phone-call/${id}`, {
            headers: { 'x-admin-key': adminKey },
          });
          const json = await res.json();
          const s = json.data?.status;
          if (s === 'processing') setStatus('processing');
          else if (s === 'done') {
            stopPolling();
            setStatus('done');
          } else if (s === 'failed') {
            stopPolling();
            setStatus('failed');
            setCallError(json.data?.error ?? '요약 생성에 실패했습니다.');
          }
        } catch {
          /* 일시 오류 무시 */
        }
        // 통화는 한참 뒤 끝날 수 있으므로 길게(30분) 폴링 후 중단. 이후엔 realtime으로 메모 표시.
        if (elapsed >= 1800) stopPolling();
      }, 8000);
    },
    [studentId, adminKey, stopPolling]
  );

  const startCall = useCallback(async () => {
    setCallError('');
    setStatus('creating');
    try {
      const repName =
        (typeof localStorage !== 'undefined' && localStorage.getItem('admin_user_name')) || '세일즈 담당자';
      const res = await fetch(`/api/crm/students/${studentId}/phone-call`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ repName }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCallError(json.error?.message ?? '통화 연결에 실패했습니다.');
        setStatus('idle');
        return;
      }
      setCallId(json.data.callId);
      setRepRoomUrl(json.data.repRoomUrl);
      setCustomerLink(json.data.customerLink);
      setCopied(null);
      setStatus('ready');
      startPolling(json.data.callId);
    } catch {
      setCallError('네트워크 오류가 발생했습니다.');
      setStatus('idle');
    }
  }, [studentId, adminKey, startPolling]);

  const copyLink = useCallback(
    async (which: 'rep' | 'customer') => {
      const text = which === 'rep' ? repRoomUrl : customerLink;
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(which);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopied(null), 2000);
      } catch {
        setCallError('링크 복사에 실패했습니다. 직접 복사해주세요.');
      }
    },
    [repRoomUrl, customerLink]
  );

  const openRepLink = useCallback(() => {
    if (repRoomUrl) window.open(repRoomUrl, '_blank', 'noopener');
  }, [repRoomUrl]);

  // 새 통화 시작을 위해 초기화
  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setCallId(null);
    setRepRoomUrl('');
    setCustomerLink('');
    setCopied(null);
    setCallError('');
  }, [stopPolling]);

  const retry = useCallback(async () => {
    if (!callId) return;
    setCallError('');
    setStatus('processing');
    try {
      const res = await fetch(`/api/crm/students/${studentId}/phone-call/${callId}`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (json.data?.status === 'done') setStatus('done');
      else {
        setStatus('failed');
        setCallError(json.data?.error ?? json.error?.message ?? '요약 생성에 실패했습니다.');
      }
    } catch {
      setStatus('failed');
      setCallError('네트워크 오류가 발생했습니다.');
    }
  }, [callId, studentId, adminKey]);

  return {
    status,
    repRoomUrl,
    customerLink,
    copied,
    callError,
    startCall,
    copyLink,
    openRepLink,
    reset,
    retry,
  };
}
