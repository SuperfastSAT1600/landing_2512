/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlaudRecordingPicker } from '../PlaudRecordingPicker';

const TWO_ACCOUNTS = [
  { key: 'me', label: '이민재' },
  { key: 'wooyoung', label: '김우영' },
];

// account_key별 녹음(2단계에서 선택한 직원 것만 내려온다).
const RECORDINGS: Record<string, unknown[]> = {
  me: [{ id: 'm1', name: '민재상담', start_at: '2026-08-05T02:00:00', account_key: 'me', owner_label: '이민재' }],
  wooyoung: [{ id: 'w1', name: '우영상담', start_at: '2026-08-04T10:00:00', account_key: 'wooyoung', owner_label: '김우영' }],
};

function mockFetch(accounts = TWO_ACCOUNTS) {
  const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
    if (url.includes('/plaud/accounts')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: accounts }) });
    }
    if (url.includes('/plaud/recordings')) {
      const key = new URL(url, 'http://localhost').searchParams.get('account_key') ?? '';
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: RECORDINGS[key] ?? [] }) });
    }
    // plaud-memo/job — POST(제출) / PUT(확인). 기본 목은 첫 확인에서 바로 완료.
    if ((_init?.method ?? 'GET') === 'POST') {
      return Promise.resolve({
        ok: true,
        status: 202,
        json: async () => ({ data: { task_id: 't1', recording_name: '녹음', recorded_at: '' } }),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 201,
      json: async () => ({ data: { status: 'done', entry: { id: 'e1', published: false } } }),
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPicker(onCreated = () => {}) {
  return render(
    <PlaudRecordingPicker
      studentId="s1"
      studentName="홍길동"
      adminKey="k"
      onClose={() => {}}
      onCreated={onCreated}
    />
  );
}

describe('PlaudRecordingPicker (REQ-006: 2단계 — 직원 선택 → 녹음 선택)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('REQ-006: 계정 2개면 먼저 직원 선택 화면을 보여준다', async () => {
    mockFetch();
    renderPicker();
    await waitFor(() => expect(screen.getByText('이민재')).toBeTruthy());
    expect(screen.getByText('김우영')).toBeTruthy();
    // 아직 녹음 목록은 안 불러온 상태(직원 미선택).
    expect(screen.queryByText('민재상담')).toBeNull();
    expect(screen.queryByText('우영상담')).toBeNull();
  });

  it('REQ-006: 직원(김우영) 선택 → 그 직원 계정 녹음만 조회하고, 선택 시 account_key 전달', async () => {
    const fetchMock = mockFetch();
    const onCreated = vi.fn();
    renderPicker(onCreated);

    await waitFor(() => expect(screen.getByText('김우영')).toBeTruthy());
    fireEvent.click(screen.getByText('김우영'));

    // 김우영 계정 녹음만 로드
    await waitFor(() => expect(screen.getByText('우영상담')).toBeTruthy());
    expect(screen.queryByText('민재상담')).toBeNull();
    const recCall = fetchMock.mock.calls.find(([u]) => String(u).includes('/plaud/recordings'));
    expect(String(recCall![0])).toContain('account_key=wooyoung');

    // 녹음 선택 → account_key=wooyoung로 POST
    fireEvent.click(screen.getByText('우영상담'));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    const submitCall = fetchMock.mock.calls.find(
      ([u, i]) => String(u).includes('/plaud-memo/job') && (i as RequestInit)?.method === 'POST'
    );
    const bodyObj = JSON.parse((submitCall![1] as RequestInit).body as string);
    expect(bodyObj).toEqual({ file_id: 'w1', account_key: 'wooyoung' });
  });

  it('REQ-006: 계정이 1개뿐이면 직원 선택을 건너뛰고 바로 녹음 목록', async () => {
    mockFetch([{ key: 'me', label: '이민재' }]);
    renderPicker();
    // 직원 선택 버튼 없이 곧장 녹음 목록.
    await waitFor(() => expect(screen.getByText('민재상담')).toBeTruthy());
  });
});


/**
 * Node 25의 실험적 전역 localStorage가 jsdom 것을 가려서(메서드 없음) 여기서 직접 심는다.
 * 컴포넌트는 bare `localStorage` 를 쓰므로 전역 스텁이면 충분하다.
 */
function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
}

describe('PlaudRecordingPicker — 제출/폴링 분리 (REQ-004)', () => {
  let store: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    store = memoryStorage();
    vi.stubGlobal('localStorage', store);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** POST는 task_id만, PUT은 호출 순서대로 응답을 돌려주는 목. */
  function mockJobFetch(putResponses: { ok: boolean; status: number; body: unknown }[]) {
    let put = 0;
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/plaud/accounts')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [{ key: 'me', label: '이민재' }] }) });
      }
      if (url.includes('/plaud/recordings')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: RECORDINGS.me }) });
      }
      if (init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 202,
          json: async () => ({ data: { task_id: 't-1', recording_name: '민재상담', duration_sec: 828 } }),
        });
      }
      const r = putResponses[Math.min(put++, putResponses.length - 1)];
      return Promise.resolve({ ok: r.ok, status: r.status, json: async () => r.body });
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('선택하면 제출만 하고, 완료 응답을 받으면 타임라인에 추가한다', async () => {
    const fetchMock = mockJobFetch([
      { ok: true, status: 201, body: { data: { status: 'done', entry: { id: 'e1' } } } },
    ]);
    const onCreated = vi.fn();
    renderPicker(onCreated);

    await waitFor(() => expect(screen.getByText('민재상담')).toBeTruthy());
    fireEvent.click(screen.getByText('민재상담'));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 'e1' }));

    const methods = fetchMock.mock.calls
      .filter(([u]) => String(u).includes('/plaud-memo/job'))
      .map(([, i]) => (i as RequestInit).method);
    expect(methods).toEqual(['POST', 'PUT']);
  });

  it('제출한 작업을 localStorage에 남겨 모달을 다시 열어도 이어받는다', async () => {
    mockJobFetch([{ ok: true, status: 200, body: { data: { status: 'running' } } }]);
    renderPicker();

    await waitFor(() => expect(screen.getByText('민재상담')).toBeTruthy());
    fireEvent.click(screen.getByText('민재상담'));

    await waitFor(() => {
      const saved = JSON.parse(store.getItem('plaud-asr-job:s1') ?? 'null');
      expect(saved).toMatchObject({ task_id: 't-1', recording_id: 'm1', account_key: 'me' });
    });
  });

  it('저장된 작업이 있으면 마운트 즉시 확인만 하고 새로 제출하지 않는다', async () => {
    store.setItem(
      'plaud-asr-job:s1',
      JSON.stringify({ task_id: 't-old', recording_id: 'm1', recording_name: '민재상담', account_key: 'me' })
    );
    const fetchMock = mockJobFetch([
      { ok: true, status: 201, body: { data: { status: 'done', entry: { id: 'e9' } } } },
    ]);
    const onCreated = vi.fn();
    renderPicker(onCreated);

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 'e9' }));

    const jobCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('/plaud-memo/job'));
    expect(jobCalls.map(([, i]) => (i as RequestInit).method)).toEqual(['PUT']);
    expect(JSON.parse((jobCalls[0][1] as RequestInit).body as string).task_id).toBe('t-old');
  });

  it('전사가 실패하면 오류를 보여주고 저장된 작업을 지운다', async () => {
    store.setItem(
      'plaud-asr-job:s1',
      JSON.stringify({ task_id: 't-bad', recording_id: 'm1', recording_name: '민재상담', account_key: 'me' })
    );
    mockJobFetch([{ ok: false, status: 502, body: { error: '전사에 실패했습니다. (bad audio)' } }]);
    renderPicker();

    expect(await screen.findByText(/bad audio/)).toBeTruthy();
    expect(store.getItem('plaud-asr-job:s1')).toBeNull();
  });
});
