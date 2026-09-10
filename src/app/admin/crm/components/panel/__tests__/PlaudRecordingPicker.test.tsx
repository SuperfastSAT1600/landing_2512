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
    // plaud-memo POST
    return Promise.resolve({
      ok: true,
      status: 201,
      json: async () => ({ data: { entry: { id: 'e1', published: false } } }),
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
    const memoCall = fetchMock.mock.calls.find(([u]) => String(u).includes('/plaud-memo'));
    const bodyObj = JSON.parse((memoCall![1] as RequestInit).body as string);
    expect(bodyObj).toEqual({ file_id: 'w1', account_key: 'wooyoung' });
  });

  it('REQ-006: 계정이 1개뿐이면 직원 선택을 건너뛰고 바로 녹음 목록', async () => {
    mockFetch([{ key: 'me', label: '이민재' }]);
    renderPicker();
    // 직원 선택 버튼 없이 곧장 녹음 목록.
    await waitFor(() => expect(screen.getByText('민재상담')).toBeTruthy());
  });
});
