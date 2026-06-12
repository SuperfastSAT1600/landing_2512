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
/** 긴 통화는 이 길이마다 세그먼트로 분할(32kbps×45분 ≈ 11MB, 파일 한도 안전). */
const MAX_SEGMENT_MS = 45 * 60 * 1000;

interface Segment { blob: Blob; mime: string }

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
 * 통화 녹음 → 업로드 → 전사·화자분리·요약. 결과는 onSummary로 전달(메모란 채움).
 * 긴 통화는 자동으로 세그먼트 분할해 업로드한다(평소 통화는 1세그먼트).
 * 스피커폰으로 통화하고 이 기기(노트북/PC) 마이크로 공기 중 소리를 녹음하는 용도.
 */
export function useCallRecording({ studentId, adminKey, onSummary }: Params) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [recordError, setRecordError] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const segmentsRef = useRef<Segment[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeRef = useRef<string>('');
  const finalizingRef = useRef(false);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedSecRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
    if (segmentTimerRef.current) { clearTimeout(segmentTimerRef.current); segmentTimerRef.current = null; }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => { clearTimers(); releaseStream(); }, [clearTimers, releaseStream]);

  const upload = useCallback(
    async (segments: Segment[], durationSec: number) => {
      setProcessing(true);
      setRecordError('');
      try {
        const form = new FormData();
        segments.forEach((seg, i) => {
          form.append('file', new File([seg.blob], `seg_${i}.${extFor(seg.mime)}`, { type: seg.mime }));
        });
        form.append('duration', String(durationSec));
        const res = await fetch(`/api/crm/students/${studentId}/call-recording`, {
          method: 'POST',
          headers: { 'x-admin-key': adminKey },
          body: form,
        });
        const json = await res.json();
        if (res.ok && json.data?.summary) onSummary(json.data.summary as string);
        else setRecordError(json.error?.message ?? '전사·요약에 실패했습니다.');
      } catch {
        setRecordError('네트워크 오류가 발생했습니다.');
      } finally {
        setProcessing(false);
      }
    },
    [studentId, adminKey, onSummary]
  );

  // 현재 스트림에서 새 세그먼트 레코더를 시작
  const startSegment = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = mimeRef.current;
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: AUDIO_BITRATE,
    });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const mime = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0];
      const blob = new Blob(chunksRef.current, { type: mime });
      if (blob.size > 0) segmentsRef.current.push({ blob, mime });
      if (finalizingRef.current) {
        releaseStream();
        const segs = segmentsRef.current;
        if (segs.length > 0) void upload(segs, elapsedSecRef.current);
      } else {
        startSegment(); // 분할: 다음 세그먼트 계속 녹음
      }
    };
    recorder.start();
    recorderRef.current = recorder;
    // 분할 타이머 재무장
    segmentTimerRef.current = setTimeout(() => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop(); // onstop에서 다음 세그먼트 시작
      }
    }, MAX_SEGMENT_MS);
  }, [releaseStream, upload]);

  const start = useCallback(async () => {
    setRecordError('');
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setRecordError('이 브라우저는 녹음을 지원하지 않습니다.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mimeRef.current = pickMimeType();
      segmentsRef.current = [];
      finalizingRef.current = false;
      elapsedSecRef.current = 0;
      setElapsedSec(0);
      startSegment();
      setRecording(true);
      elapsedTimerRef.current = setInterval(() => {
        elapsedSecRef.current += 1;
        setElapsedSec(elapsedSecRef.current);
      }, 1000);
    } catch {
      setRecordError('마이크 권한이 필요합니다. 브라우저 권한을 허용해주세요.');
      releaseStream();
    }
  }, [startSegment, releaseStream]);

  const stop = useCallback(() => {
    clearTimers();
    setRecording(false);
    finalizingRef.current = true;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop(); // onstop이 마지막 세그먼트 push 후 업로드
    }
    recorderRef.current = null;
  }, [clearTimers]);

  const toggle = useCallback(() => {
    if (recording) stop();
    else void start();
  }, [recording, start, stop]);

  return { recording, processing, elapsedSec, recordError, setRecordError, toggle };
}
