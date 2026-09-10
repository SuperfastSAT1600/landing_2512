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

/** 결제 유형 → 수업 유형 → 과목까지 진행해 상품 선택 단계로 이동한다. */
function openProductStep(classTypeLabel: string) {
  render(<PaymentModal student={STUDENT} adminKey="k" onConfirm={() => {}} onClose={() => {}} />);
  fireEvent.click(screen.getByText('최초결제'));
  fireEvent.click(screen.getByText(classTypeLabel));
  fireEvent.click(screen.getByText('SAT'));
}

describe('PaymentModal — 상품 목록', () => {
  it('1:1 SAT에 대표코치 상품을 노출하고 시간 입력을 요구한다', () => {
    openProductStep('1:1 수업');

    const option = screen.getByText('SAT 정규 1:1 수업 (대표코치)');
    expect(option).toBeTruthy();

    fireEvent.click(option);
    expect(screen.getByPlaceholderText('시간 수')).toBeTruthy();
  });

  it('소수점 시간(41.5)을 그대로 결제 API로 보낸다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { student: STUDENT, payment: { id: 'pay-1' } } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    openProductStep('1:1 수업');
    fireEvent.click(screen.getByText('SAT 정규 1:1 수업 (관리형)'));
    fireEvent.change(screen.getByPlaceholderText('시간 수'), { target: { value: '41.5' } });
    fireEvent.change(screen.getByPlaceholderText('예: 2990000 (가결제는 0)'), { target: { value: '4450000' } });

    const confirm = screen.getByText('결제 완료') as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.hours).toBe(41.5);

    vi.unstubAllGlobals();
  });

  it('그룹 SAT에 추석특강 상품을 여름방학 특강과 함께 노출한다', () => {
    openProductStep('그룹 수업');

    expect(screen.getByText('SAT 정규 그룹 수업 (여름방학 특강)')).toBeTruthy();

    const chuseok = screen.getByText('SAT 정규 그룹 수업 (추석특강)');
    expect(chuseok).toBeTruthy();

    // 그룹 특강은 시간 단위 상품이 아니다.
    fireEvent.click(chuseok);
    expect(screen.queryByPlaceholderText('시간 수')).toBeNull();
  });
});
