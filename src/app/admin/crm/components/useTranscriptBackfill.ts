'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 전사 백필 배치 루프.
 *
 * 서버는 한 요청에서 시간 예산 안에 처리할 수 있는 만큼만 하고 남은 건수를 돌려준다.
 * 여기서는 remaining이 0이 될 때까지 반복 호출하되, 진행이 없으면 멈춘다.
 *
 * `listing`(첫 응답 대기)과 `running`(집계가 있는 상태)을 나누는 것이 핵심이다.
 * 둘을 합치면 아직 아무 숫자도 모르는 구간에서 0으로 채운 표가 그려지고,
 * 사용자는 그것을 "대상 없음"으로 읽는다.
 */

export type BackfillPhase = 'idle' | 'listing' | 'running' | 'done' | 'stopped' | 'error';

export interface BackfillFailure {
  studentId: string;
  entryId: string;
  recordingName: string;
  error: string;
}

/** 서버 리포트 중 화면이 쓰는 부분. */
export interface BackfillBatchReport {
  candidates: number;
  inserted: number;
  failed: number;
  remaining: number;
  unmatched: number;
  ambiguous: number;
  budgetExhausted?: boolean;
  listingMs?: number;
  elapsedMs?: number;
  failedEntries?: BackfillFailure[];
}

/** 서버 실행 한도(maxDuration 300s)보다 조금 길게 — 서버가 스스로 끝낼 시간을 먼저 준다. */
export const REQUEST_TIMEOUT_MS = 310_000;

const ENDPOINT = '/api/crm/plaud/backfill-transcripts';

type FailureKind = 'timeout' | 'server' | 'network';

class BatchRequestError extends Error {
  constructor(
    readonly kind: FailureKind,
    message: string
  ) {
    super(message);
  }
}

const TIMEOUT_MESSAGE =
  '이 배치가 시간을 초과했습니다(서버 실행 한도 약 5분). 다시 실행하면 남은 건부터 이어갑니다.';
const NETWORK_MESSAGE = '네트워크 오류가 발생했습니다. 연결을 확인한 뒤 다시 실행해주세요.';

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  // 504는 JSON이 아니라 게이트웨이 HTML을 돌려준다. 파싱 실패를 오류의 정체로 삼지 않는다.
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function postBatch(adminKey: string): Promise<BackfillBatchReport> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({}),
      signal: controller.signal,
    });
  } catch {
    throw new BatchRequestError(
      timedOut ? 'timeout' : 'network',
      timedOut ? TIMEOUT_MESSAGE : NETWORK_MESSAGE
    );
  } finally {
    clearTimeout(timer);
  }

  const body = await readJson(res);
  if (!res.ok) {
    // 504/408은 실행 한도 초과다 — 다시 실행하면 이어지므로 서버 장애와 구분해 안내한다.
    if (res.status === 504 || res.status === 408) throw new BatchRequestError('timeout', TIMEOUT_MESSAGE);
    const detail = typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`;
    throw new BatchRequestError('server', `서버 오류: ${detail}`);
  }

  const data = body?.data as BackfillBatchReport | undefined;
  if (!data) throw new BatchRequestError('server', '서버 응답을 이해할 수 없습니다.');
  return data;
}

/** 저장이 0건인데 남은 건이 있는 상황 — 같은 배치를 반복해도 결과가 같으므로 멈추고 원인을 알린다. */
function explainNoProgress(r: BackfillBatchReport): string {
  if (r.budgetExhausted && r.listingMs) {
    const sec = Math.round(r.listingMs / 1000);
    return `목록 조회에만 ${sec}초가 걸려 이번 배치에서 전사할 시간이 남지 않았습니다. 계정을 나눠 실행하거나 조회 범위를 줄여야 합니다.`;
  }
  if (r.failed > 0) return `전사 ${r.failed}건이 모두 실패해 중단했습니다.`;
  return '처리가 진행되지 않아 중단했습니다. 서버 로그를 확인해주세요.';
}

interface BackfillState {
  phase: BackfillPhase;
  batch: number;
  target: number | null;
  inserted: number;
  failed: number;
  remaining: number;
  unmatched: number;
  ambiguous: number;
  failures: BackfillFailure[];
  error: string;
}

const INITIAL: BackfillState = {
  phase: 'idle', batch: 0, target: null, inserted: 0, failed: 0,
  remaining: 0, unmatched: 0, ambiguous: 0, failures: [], error: '',
};

export function useTranscriptBackfill(adminKey: string) {
  const [state, setState] = useState<BackfillState>(INITIAL);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [stopRequested, setStopRequested] = useState(false);
  // 취소는 다음 배치 시작 전에만 걸린다 — 진행 중인 전사를 끊으면 이미 쓴 ASR 비용이 버려진다.
  const stopRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTicking = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }, []);

  useEffect(() => stopTicking, [stopTicking]);

  const start = useCallback(async () => {
    stopRef.current = false;
    setStopRequested(false);
    setState({ ...INITIAL, phase: 'listing' });
    setElapsedMs(0);

    const startedAt = Date.now();
    stopTicking();
    tickRef.current = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);

    // 누적값은 지역 변수로 잡는다 — state는 이 루프의 클로저에 반영되지 않는다.
    // target은 첫 응답으로 고정한다. candidates는 "남은 후보 수"라 배치마다 줄어들어,
    // 그대로 쓰면 진행할수록 대상이 작아지는 화면이 된다.
    let target: number | null = null;
    let inserted = 0;
    let failed = 0;
    let batch = 0;

    try {
      for (;;) {
        let r: BackfillBatchReport;
        try {
          r = await postBatch(adminKey);
        } catch (e) {
          const message = e instanceof BatchRequestError ? e.message : NETWORK_MESSAGE;
          setState((prev) => ({ ...prev, phase: 'error', error: message }));
          return;
        }

        batch++;
        inserted += r.inserted;
        failed += r.failed;
        if (target === null) target = r.candidates;

        const next: BackfillState = {
          phase: 'running',
          batch,
          target,
          inserted,
          failed,
          remaining: r.remaining,
          unmatched: r.unmatched,
          ambiguous: r.ambiguous,
          failures: r.failedEntries ?? [],
          error: '',
        };

        if (r.remaining === 0) return setState({ ...next, phase: 'done' });
        if (r.inserted === 0) return setState({ ...next, phase: 'error', error: explainNoProgress(r) });
        if (stopRef.current) return setState({ ...next, phase: 'stopped' });
        setState(next);
      }
    } finally {
      stopTicking();
      setElapsedMs(Date.now() - startedAt);
    }
  }, [adminKey, stopTicking]);

  const stop = useCallback(() => {
    stopRef.current = true;
    setStopRequested(true);
  }, []);

  // 매칭 실패 건은 영영 저장되지 않으므로 분자에 넣어야 100%에 도달한다.
  const progress =
    state.target && state.target > 0
      ? Math.min(1, (state.inserted + state.unmatched + state.ambiguous) / state.target)
      : null;

  return { ...state, elapsedMs, stopRequested, progress, start, stop };
}
