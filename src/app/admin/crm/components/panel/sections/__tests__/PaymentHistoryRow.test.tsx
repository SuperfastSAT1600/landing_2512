/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentHistoryRow } from '../PaymentHistoryRow';
import type { Payment } from '@/types/crm';

const PAYMENT: Payment = {
  id: 'pay-1',
  student_id: 's1',
  student_name: '정예준',
  product: 'SAT 정규 1:1 수업 (관리형)',
  product_category: null,
  product_subcategory: null,
  hours: 18,
  amount: 0,
  payment_type: '최초결제',
  tax_type: '과세',
  paid_at: '2026-08-10',
  created_by: '김우영',
  notes: null,
  created_at: '2026-08-10T07:05:27Z',
};

function renderRow(over: Partial<React.ComponentProps<typeof PaymentHistoryRow>> = {}) {
  const onSave = over.onSave ?? vi.fn().mockResolvedValue(true);
  const utils = render(
    <PaymentHistoryRow
      payment={PAYMENT}
      savingType={null}
      deleting={false}
      onTypeChange={vi.fn()}
      onDelete={vi.fn()}
      {...over}
      onSave={onSave}
    />
  );
  return { ...utils, onSave };
}

const startEditing = () => fireEvent.click(screen.getByTitle('금액·시간 수정'));

describe('PaymentHistoryRow', () => {
  it('shows a 0원 payment as 가결제', () => {
    renderRow();
    expect(screen.getByText('₩0')).toBeTruthy();
    expect(screen.getByText('가결제')).toBeTruthy();
  });

  it('saves the edited 금액 and 시간', async () => {
    const { onSave } = renderRow();
    startEditing();

    fireEvent.change(screen.getByLabelText('금액'), { target: { value: '1200000' } });
    fireEvent.change(screen.getByLabelText('시간'), { target: { value: '12' } });
    fireEvent.click(screen.getByText('저장'));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('pay-1', { amount: 1200000, hours: 12 }));
  });

  it('sends hours: null when the 시간 field is cleared', async () => {
    const { onSave } = renderRow();
    startEditing();

    fireEvent.change(screen.getByLabelText('시간'), { target: { value: '' } });
    fireEvent.click(screen.getByText('저장'));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('pay-1', { amount: 0, hours: null }));
  });

  it('cancel restores the original values without saving', () => {
    const { onSave } = renderRow();
    startEditing();

    fireEvent.change(screen.getByLabelText('금액'), { target: { value: '999' } });
    fireEvent.click(screen.getByText('취소'));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('₩0')).toBeTruthy();
  });

  it('blocks saving a negative 금액 on a non-refund payment', () => {
    const { onSave } = renderRow();
    startEditing();

    fireEvent.change(screen.getByLabelText('금액'), { target: { value: '-1' } });
    expect((screen.getByText('저장') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('저장'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('requires a negative 금액 on a refund payment', () => {
    const refund = { ...PAYMENT, payment_type: '환불', amount: -500000 };
    const { onSave } = renderRow({ payment: refund });
    startEditing();

    fireEvent.change(screen.getByLabelText('금액'), { target: { value: '500000' } });
    expect((screen.getByText('저장') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('저장'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('stays in edit mode when saving fails', async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    renderRow({ onSave });
    startEditing();

    fireEvent.change(screen.getByLabelText('금액'), { target: { value: '1200000' } });
    fireEvent.click(screen.getByText('저장'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(screen.getByLabelText('금액')).toBeTruthy();
  });
});
