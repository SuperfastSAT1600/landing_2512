import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTranscriptBackfill, REQUEST_TIMEOUT_MS } from '../useTranscriptBackfill';

type FetchMock = ReturnType<typeof vi.fn>;
const mockFetch = () => fetch as unknown as FetchMock;

const batch = (over: Record<string, unknown> = {}) => ({
  ok: true,
  status: 200,
  json: async () => ({
    data: {
      candidates: 7, inserted: 2, failed: 0, remaining: 3,
      unmatched: 0, ambiguous: 0, budgetExhausted: false,
      listingMs: 2_000, elapsedMs: 60_000, failedEntries: [],
      ...over,
    },
  }),
});

/** 응답하지 않는 요청. abort가 걸리면 그때 거절한다 — 실제 fetch와 같은 방식. */
const neverResolves = () =>
  vi.fn(
    (_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      })
  );

describe('useTranscriptBackfill', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('첫 응답 전에는 집계 단계에 머문다 — 0으로 채운 결과를 만들지 않는다', async () => {
    vi.stubGlobal('fetch', neverResolves());
    const { result } = renderHook(() => useTranscriptBackfill('k'));

    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.phase).toBe('listing'));
    expect(result.current.target).toBeNull(); // 아직 대상 건수를 모른다
    expect(result.current.batch).toBe(0);
  });

  it('배치마다 누적하고 배치 번호를 올린다', async () => {
    mockFetch()
      .mockResolvedValueOnce(batch({ inserted: 2, remaining: 3 }))
      .mockResolvedValueOnce(batch({ candidates: 5, inserted: 3, remaining: 0 }));

    const { result } = renderHook(() => useTranscriptBackfill('k'));
    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(result.current.batch).toBe(2);
    expect(result.current.inserted).toBe(5);
    expect(result.current.target).toBe(7); // 첫 응답으로 고정
  });

  it('진행률은 매칭 실패 건을 분자에 포함한다 — 영영 저장되지 않으므로', async () => {
    mockFetch().mockResolvedValueOnce(
      batch({ candidates: 10, inserted: 4, unmatched: 2, ambiguous: 1, remaining: 0 })
    );

    const { result } = renderHook(() => useTranscriptBackfill('k'));
    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(result.current.progress).toBeCloseTo(0.7); // (4 + 2 + 1) / 10
  });

  it('응답이 오지 않으면 타임아웃으로 끊고 이어서 실행하라고 안내한다', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', neverResolves());
    const { result } = renderHook(() => useTranscriptBackfill('k'));

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.advanceTimersByTime(REQUEST_TIMEOUT_MS + 1_000);
    });

    expect(result.current.phase).toBe('error');
    expect(result.current.error).toMatch(/시간을 초과/);
    expect(result.current.error).toMatch(/이어갑니다/);
  });

  it('504가 JSON이 아닌 본문을 돌려줘도 네트워크 오류로 뭉개지 않는다', async () => {
    mockFetch().mockResolvedValueOnce({
      ok: false,
      status: 504,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    });

    const { result } = renderHook(() => useTranscriptBackfill('k'));
    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current.error).toMatch(/시간을 초과/); // 504 = 서버리스 실행 한도 초과
    expect(result.current.error).not.toMatch(/네트워크/);
  });

  it('서버가 보낸 오류 메시지를 그대로 보여준다', async () => {
    mockFetch().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Plaud 연결 실패' }),
    });

    const { result } = renderHook(() => useTranscriptBackfill('k'));
    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current.error).toMatch(/Plaud 연결 실패/);
  });

  it('목록 조회가 예산을 다 쓴 경우 그 시간을 명시해 안내한다', async () => {
    mockFetch().mockResolvedValue(
      batch({ inserted: 0, failed: 0, remaining: 4, budgetExhausted: true, listingMs: 152_000 })
    );

    const { result } = renderHook(() => useTranscriptBackfill('k'));
    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current.error).toMatch(/목록 조회/);
    expect(result.current.error).toMatch(/152초/);
    expect(mockFetch()).toHaveBeenCalledTimes(1); // 같은 결과가 반복될 뿐이므로 재시도하지 않는다
  });

  it('전사가 전부 실패하면 실패 사유를 함께 보고한다', async () => {
    mockFetch().mockResolvedValue(
      batch({
        inserted: 0,
        failed: 2,
        remaining: 2,
        failedEntries: [
          { studentId: 's1', entryId: 'e1', recordingName: '녹음 A', error: 'AsrTimeoutError' },
          { studentId: 's2', entryId: 'e2', recordingName: '녹음 B', error: 'quota exceeded' },
        ],
      })
    );

    const { result } = renderHook(() => useTranscriptBackfill('k'));
    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current.failures).toHaveLength(2);
    expect(result.current.failures[0]).toMatchObject({ recordingName: '녹음 A', error: 'AsrTimeoutError' });
    expect(result.current.error).toMatch(/전사 2건이 모두 실패/);
  });

  it('중단 요청은 진행 중인 배치를 끊지 않고 다음 배치 전에 걸린다', async () => {
    mockFetch().mockResolvedValue(batch({ inserted: 2, remaining: 3 }));

    const { result } = renderHook(() => useTranscriptBackfill('k'));
    act(() => {
      result.current.start();
      result.current.stop();
    });

    await waitFor(() => expect(result.current.phase).toBe('stopped'));
    expect(mockFetch()).toHaveBeenCalledTimes(1); // 진행 중이던 1건은 끝까지 간다
    expect(result.current.inserted).toBe(2); // 이미 쓴 ASR 비용은 버리지 않는다
  });

  it('관리자 키를 헤더로 보내고 요청에 취소 신호를 건다', async () => {
    mockFetch().mockResolvedValueOnce(batch({ remaining: 0 }));

    const { result } = renderHook(() => useTranscriptBackfill('secret'));
    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.phase).toBe('done'));
    const [url, init] = mockFetch().mock.calls[0];
    expect(url).toBe('/api/crm/plaud/backfill-transcripts');
    expect(init.headers['x-admin-key']).toBe('secret');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
