/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

/** 결제 유형 → 수업 유형 → 과목 → 상품까지 진행해 금액 입력 단계로 이동한다. */
function openAmountStep() {
  render(<PaymentModal student={STUDENT} adminKey="k" onConfirm={() => {}} onClose={() => {}} />);
  fireEvent.click(screen.getByText('최초결제'));
  fireEvent.click(screen.getByText('1:1 수업'));
  fireEvent.click(screen.getByText('SAT'));
  fireEvent.click(screen.getByText('SAT 정규 1:1 수업 (관리형)'));
  fireEvent.change(screen.getByPlaceholderText('시간 수'), { target: { value: '18' } });
  return {
    amountInput: screen.getByPlaceholderText('예: 2990000 (가결제는 0)'),
    confirmButton: screen.getByRole('button', { name: '결제 완료' }) as HTMLButtonElement,
  };
}

describe('PaymentModal — 0원 가결제', () => {
  it('enables 결제 완료 when the amount is 0 and labels it 가결제', () => {
    const { amountInput, confirmButton } = openAmountStep();
    fireEvent.change(amountInput, { target: { value: '0' } });

    expect(confirmButton.disabled).toBe(false);
    expect(screen.getByText(/가결제/)).toBeTruthy();
  });

  it('keeps 결제 완료 disabled while the amount is empty', () => {
    const { confirmButton } = openAmountStep();
    expect(confirmButton.disabled).toBe(true);
  });

  it('keeps 결제 완료 disabled for a negative amount', () => {
    const { amountInput, confirmButton } = openAmountStep();
    fireEvent.change(amountInput, { target: { value: '-1000' } });
    expect(confirmButton.disabled).toBe(true);
  });

  it('still accepts a normal positive amount', () => {
    const { amountInput, confirmButton } = openAmountStep();
    fireEvent.change(amountInput, { target: { value: '1200000' } });
    expect(confirmButton.disabled).toBe(false);
    // 금액 미리보기 + 면세 수익 표시 두 곳에 노출된다.
    expect(screen.getAllByText('1,200,000원').length).toBeGreaterThan(0);
  });
});
