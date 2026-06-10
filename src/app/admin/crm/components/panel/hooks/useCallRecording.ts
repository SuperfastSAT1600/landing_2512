'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Params {
  studentId: string;
  adminKey: string;
  /** 전사·요약 결과(메모 초안)를 받아 처리(메모란 채우기 등) */
  onSummary: (summary: string) => void;
}

/** 음성 녹음에 적당한, 파일을 작게 유지하는 비트레이트(32kbps). */
const AUDIO_BITRATE = 32000;

/** 브라우저가 지원하는 녹음 MIME 선택 (Chrome=webm, Safari=mp4). */
function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return '';
}

function extFor(mime: string): string {
  const base = mime.split(';')[0];
  if (base.includes('webm')) return 'webm';
  if (base.includes('mp4')) return 'm4a';
  if (base.includes('ogg')) return 'ogg';
  return 'webm';
}

/**
 * 통화 녹음 → 업로드 → 전사·요약. 결과는 onSummary로 전달(메모란 채움).
 * 스피커폰으로 통화하고 이 기기(노트북/PC) 마이크로 공기 중 소리를 녹음하는 용도.
 */
export function useCallRecording({ studentId, adminKey, onSummary }: Params) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [recordError, setRecordError] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 타이머 값을 onstop 콜백에서 읽기 위한 ref
  const elapsedSecRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // 언마운트 시 정리
  useEffect(() => () => { stopTimer(); releaseStream(); }, [stopTimer, releaseStream]);

  const upload = useCallback(
    async (blob: Blob, mime: string, durationSec: number) => {
      setProcessing(true);
      setRecordError('');
      try {
        const form = new FormData();
        form.append('file', new File([blob], `call.${extFor(mime)}`, { type: mime }));
        form.append('duration', String(durationSec));
        const res = await fetch(`/api/crm/students/${studentId}/call-recording`, {
          method: 'POST',
          headers: { 'x-admin-key': adminKey },
          body: form,
        });
        const json = await res.json();
        if (res.ok && json.data?.summary) {
          onSummary(json.data.summary as string);
        } else {
          setRecordError(json.error?.message ?? '전사·요약에 실패했습니다.');
        }
      } catch {
        setRecordError('네트워크 오류가 발생했습니다.');
      } finally {
        setProcessing(false);
      }
    },
    [studentId, adminKey, onSummary]
  );

  const start = useCallback(async () => {
    setRecordError('');
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setRecordError('이 브라우저는 녹음을 지원하지 않습니다.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: AUDIO_BITRATE,
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const mime = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        const duration = elapsedSecRef.current;
        releaseStream();
        if (blob.size > 0) void upload(blob, mime.split(';')[0], duration);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setElapsedSec(0);
      elapsedSecRef.current = 0;
      timerRef.current = setInterval(() => {
        elapsedSecRef.current += 1;
        setElapsedSec(elapsedSecRef.current);
      }, 1000);
    } catch {
      setRecordError('마이크 권한이 필요합니다. 브라우저 권한을 허용해주세요.');
      releaseStream();
    }
  }, [upload, releaseStream]);

  const stop = useCallback(() => {
    stopTimer();
    setRecording(false);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
  }, [stopTimer]);

  const toggle = useCallback(() => {
    if (recording) stop();
    else void start();
  }, [recording, start, stop]);

  return { recording, processing, elapsedSec, recordError, setRecordError, toggle };
}
