/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentModal } from '../PaymentModal';
import type { Student } from '@/types/crm';

vi.mock('@/hooks/useCompanies', () => ({ useCompanies: () => ({ companies: [] }) }));
vi.mock('@/lib/admin-user', () => ({ getAdminUserName: () => '테스터' }));

// 이미 가입한 학생 — 결제 성공 시 가입 링크 단계 없이 바로 onConfirm으로 닫힌다.
const STUDENT = {
  id: 's1',
  name: '정예준',
  lead_type: 'B2C',
  b2b_partner: null,
  signup_done_at: '2026-01-01T00:00:00Z',
  stage_history: [],
} as unknown as Student;

const ENROLLED = { ...STUDENT, lead_status: 'enrolled', funnel_stage: '8' } as unknown as Student;

interface Reply { ok: boolean; status: number; body: unknown }
const ENROLL_FAILED: Reply = {
  ok: false,
  status: 500,
  body: { error: '결제는 기록됐지만 학생을 "수업 중"으로 바꾸지 못했습니다.', code: 'ENROLL_FAILED', data: { payment: { id: 'pay-1' } } },
};
const PATCH_OK: Reply = { ok: true, status: 200, body: { data: ENROLLED } };
const PATCH_FAIL: Reply = { ok: false, status: 500, body: { error: { message: '전환 실패' } } };

/** 호출 순서대로 응답을 돌려주고, 호출 기록(url/method)을 남긴다. */
function stubFetch(replies: Reply[]) {
  const calls: { url: string; method: string }[] = [];
  let i = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? 'GET' });
    const r = replies[Math.min(i++, replies.length - 1)];
    return { ok: r.ok, status: r.status, json: async () => r.body };
  }));
  return calls;
}

function renderAndSubmit(onConfirm = vi.fn()) {
  render(<PaymentModal student={STUDENT} adminKey="k" onConfirm={onConfirm} onClose={() => {}} />);
  fireEvent.click(screen.getByText('최초결제'));
  fireEvent.click(screen.getByText('1:1 수업'));
  fireEvent.click(screen.getByText('SAT'));
  fireEvent.click(screen.getByText('SAT 정규 1:1 수업 (관리형)'));
  fireEvent.change(screen.getByPlaceholderText('시간 수'), { target: { value: '18' } });
  fireEvent.change(screen.getByPlaceholderText('예: 2990000 (가결제는 0)'), { target: { value: '1200000' } });
  fireEvent.click(screen.getByRole('button', { name: '결제 완료' }));
  return onConfirm;
}

const paymentPosts = (calls: { url: string; method: string }[]) =>
  calls.filter((c) => c.url.endsWith('/payment') && c.method === 'POST').length;

describe('PaymentModal — 결제 저장 후 수업 중 전환 실패', () => {
  afterEach(() => vi.unstubAllGlobals());

  // REQ-002
  it('전환이 실패한 뒤에는 결제를 다시 보내지 않고 전환만 재시도한다', async () => {
    const calls = stubFetch([ENROLL_FAILED, PATCH_OK]);
    renderAndSubmit();

    const retry = await screen.findByRole('button', { name: /전환 다시 시도/ });
    fireEvent.click(retry);

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(paymentPosts(calls)).toBe(1);
    expect(calls[1]).toEqual({ url: '/api/crm/students/s1', method: 'PATCH' });
  });

  // REQ-003
  it('재시도가 성공하면 저장된 결제 id로 정상 완료한다', async () => {
    stubFetch([ENROLL_FAILED, PATCH_OK]);
    const onConfirm = renderAndSubmit();

    fireEvent.click(await screen.findByRole('button', { name: /전환 다시 시도/ }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(ENROLLED, 'pay-1'));
  });

  // REQ-004
  it('재시도도 실패하면 안내를 유지하고, 몇 번을 눌러도 결제는 1번만 전송된다', async () => {
    const calls = stubFetch([ENROLL_FAILED, PATCH_FAIL, PATCH_FAIL]);
    const onConfirm = renderAndSubmit();

    fireEvent.click(await screen.findByRole('button', { name: /전환 다시 시도/ }));
    await waitFor(() => expect(calls).toHaveLength(2));
    fireEvent.click(await screen.findByRole('button', { name: /전환 다시 시도/ }));
    await waitFor(() => expect(calls).toHaveLength(3));

    expect(paymentPosts(calls)).toBe(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/전환 실패|결제는 기록/)).toBeTruthy();
  });
});
