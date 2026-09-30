/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentModal } from '../PaymentModal';
import type { Student } from '@/types/crm';

vi.mock('@/hooks/useCompanies', () => ({ useCompanies: () => ({ companies: [] }) }));
vi.mock('@/lib/admin-user', () => ({ getAdminUserName: () => '테스터' }));

const STUDENT = {
  id: 's1',
  name: '정예준',
  lead_type: 'B2C',
  b2b_partner: null,
  signup_done_at: null,
} as unknown as Student;

/** 상품·금액까지 채워 '결제 완료'를 누를 수 있는 상태로 만든다. */
function fillToConfirm() {
  render(<PaymentModal student={STUDENT} adminKey="k" onConfirm={() => {}} onClose={() => {}} />);
  fireEvent.click(screen.getByText('최초결제'));
  fireEvent.click(screen.getByText('1:1 수업'));
  fireEvent.click(screen.getByText('SAT'));
  fireEvent.click(screen.getByText('SAT 정규 1:1 수업 (관리형)'));
  fireEvent.change(screen.getByPlaceholderText('시간 수'), { target: { value: '20' } });
  fireEvent.change(screen.getByPlaceholderText('예: 2990000 (가결제는 0)'), {
    target: { value: '2990000' },
  });
}

function mockFetch() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { student: STUDENT, payment: { id: 'pay-1' } } }),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function sentBody(fetchMock: ReturnType<typeof mockFetch>) {
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  return JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
}

describe('PaymentModal — 결제수단 (REQ-001)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('결제수단 선택지를 노출한다', () => {
    fillToConfirm();
    expect(screen.getByText('계좌이체')).toBeTruthy();
    expect(screen.getByText('신용카드')).toBeTruthy();
    expect(screen.getByText('토스결제')).toBeTruthy();
  });

  it('고른 결제수단을 payload에 담는다', async () => {
    const fetchMock = mockFetch();
    fillToConfirm();
    fireEvent.click(screen.getByText('신용카드'));
    fireEvent.click(screen.getByText('결제 완료'));

    expect((await sentBody(fetchMock)).payment_method).toBe('신용카드');
  });

  it('안 고르면 payment_method를 아예 보내지 않는다 — NULL로 남긴다', async () => {
    const fetchMock = mockFetch();
    fillToConfirm();
    fireEvent.click(screen.getByText('결제 완료'));

    expect('payment_method' in (await sentBody(fetchMock))).toBe(false);
  });

  it('같은 결제수단을 다시 누르면 선택이 해제된다', async () => {
    const fetchMock = mockFetch();
    fillToConfirm();
    fireEvent.click(screen.getByText('토스결제'));
    fireEvent.click(screen.getByText('토스결제'));
    fireEvent.click(screen.getByText('결제 완료'));

    expect('payment_method' in (await sentBody(fetchMock))).toBe(false);
  });
});
