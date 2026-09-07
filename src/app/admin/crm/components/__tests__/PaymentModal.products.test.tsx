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
