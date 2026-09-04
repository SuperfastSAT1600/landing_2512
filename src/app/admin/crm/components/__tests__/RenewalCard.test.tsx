import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { RenewalCard } from '../RenewalCard';
import type { RenewalStage, RenewalTarget } from '@/types/crm';
import type { TutoringDisplayStatus } from '../TutoringStudentRow';

const NOW = Date.parse('2026-08-17T09:00:00Z');

function target(stage: RenewalStage, over: Partial<RenewalTarget> = {}): RenewalTarget {
  return {
    id: 'rt-1',
    student_id: 's-1',
    week_start: '2026-08-17',
    stage,
    stage_updated_at: '2026-08-14T09:00:00Z', // 3일 전
    converted_payment_id: null,
    drop_reason: null,
    memo: null,
    outcome_quality: null,
    outcome_reason_tag: null,
    outcome_reason_note: null,
    carried_to_week: null,
    carried_from_week: null,
    created_by: null,
    created_at: '2026-08-14T09:00:00Z',
    updated_at: '2026-08-14T09:00:00Z',
    student: {
      id: 's-1',
      name: '김학생',
      grade: '11',
      parent_phone: '010-1111-2222',
      is_vip: false,
      needs_attention: false,
      traffic_source: null,
      lead_type: 'B2C',
    },
    ...over,
  };
}

function renderCard(
  props: Partial<React.ComponentProps<typeof RenewalCard>> & { stage?: RenewalStage } = {}
) {
  const { stage = '1', ...rest } = props;
  const t = rest.target ?? target(stage);
  return render(
    <DndContext>
      <SortableContext items={[t.id]}>
        <RenewalCard nowMs={NOW} target={t} tutoring={null} onClick={() => {}} {...rest} />
      </SortableContext>
    </DndContext>
  );
}

describe('RenewalCard', () => {
  it('renders the student name, grade and phone', () => {
    renderCard();
    expect(screen.getByText('김학생')).toBeTruthy();
    expect(screen.getByText('11')).toBeTruthy();
    expect(screen.getByText('010-1111-2222')).toBeTruthy();
  });

  it('measures D+N from stage_updated_at, not the original inquiry date', () => {
    renderCard();
    expect(screen.getByText('단계 D+3')).toBeTruthy();
  });

  it('warns on stage age at the 7 and 14 day thresholds', () => {
    const fresh = renderCard({ target: target('2', { stage_updated_at: '2026-08-16T09:00:00Z' }) });
    expect(screen.getByText('단계 D+1').className).toContain('text-gray-400');
    fresh.unmount();

    const stale = renderCard({ target: target('2', { stage_updated_at: '2026-08-09T09:00:00Z' }) });
    expect(screen.getByText('단계 D+8').className).toContain('text-amber-500');
    stale.unmount();

    renderCard({ target: target('2', { stage_updated_at: '2026-08-01T09:00:00Z' }) });
    expect(screen.getByText('단계 D+16').className).toContain('text-red-400');
  });

  it('shows remaining hours and the tutoring status when known', () => {
    renderCard({
      tutoring: {
        displayStatus: 'sales' as TutoringDisplayStatus,
        remainingHours: 0,
        scheduledHours: 0,
        overscheduledHours: 0,
      },
    });
    expect(screen.getByText('잔여 0h')).toBeTruthy();
    expect(screen.getByText('재결제세일즈')).toBeTruthy();
  });

  it('omits the hours line when the student is not linked to SRM', () => {
    renderCard({ tutoring: null });
    expect(screen.queryByText(/잔여/)).toBeNull();
  });

  it('shows a negative 잔여 plus 예약/초과 — the payment-page urgency signals', () => {
    renderCard({
      tutoring: {
        displayStatus: 'sales' as TutoringDisplayStatus,
        remainingHours: -3,
        scheduledHours: 19,
        overscheduledHours: 22,
      },
    });
    expect(screen.getByText('잔여 -3h').className).toContain('text-red-600');
    expect(screen.getByText('예약 19h')).toBeTruthy();
    expect(screen.getByText('초과 22h').className).toContain('text-orange-600');
  });

  it('hides 예약/초과 when they are zero so the card stays quiet', () => {
    renderCard({
      tutoring: {
        displayStatus: 'active' as TutoringDisplayStatus,
        remainingHours: 40,
        scheduledHours: 0,
        overscheduledHours: 0,
      },
    });
    expect(screen.getByText('잔여 40h')).toBeTruthy();
    expect(screen.queryByText(/예약/)).toBeNull();
    expect(screen.queryByText(/초과/)).toBeNull();
  });

  it('shows the VIP badge for VIP students', () => {
    renderCard({ target: target('1', { student: { ...target('1').student!, is_vip: true } }) });
    expect(screen.getByText('VIP')).toBeTruthy();
  });

  it('shows the 주의 badge for flagged students', () => {
    renderCard({ target: target('1', { student: { ...target('1').student!, needs_attention: true } }) });
    expect(screen.getByText('주의')).toBeTruthy();
  });

  it('offers 결제 only on the 결제 대기 stage', () => {
    const onPayment = vi.fn();
    const waiting = renderCard({ stage: '3', onPayment });
    fireEvent.click(screen.getByRole('button', { name: '결제' }));
    expect(onPayment).toHaveBeenCalledTimes(1);
    waiting.unmount();

    renderCard({ stage: '2', onPayment });
    expect(screen.queryByRole('button', { name: '결제' })).toBeNull();
  });

  it('offers 미전환 on open stages and hides it on terminal stages', () => {
    const onDrop = vi.fn();
    const open = renderCard({ stage: '2', onDrop });
    fireEvent.click(screen.getByRole('button', { name: '미전환' }));
    expect(onDrop).toHaveBeenCalledTimes(1);
    open.unmount();

    const paid = renderCard({ stage: '4', onDrop });
    expect(screen.queryByRole('button', { name: '미전환' })).toBeNull();
    paid.unmount();

    renderCard({ stage: '5', onDrop });
    expect(screen.queryByRole('button', { name: '미전환' })).toBeNull();
  });

  it('requires a second click to confirm 제외 so a hard delete cannot happen by accident', () => {
    const onRemove = vi.fn();
    renderCard({ stage: '1', onRemove });

    fireEvent.click(screen.getByRole('button', { name: '제외' }));
    expect(onRemove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('offers 되돌리기 on 미전환 cards and shows the recorded reason', () => {
    const onReopen = vi.fn();
    renderCard({
      target: target('5', { outcome_quality: 'bad', outcome_reason_tag: '예산 부담' }),
      onReopen,
    });
    expect(screen.getByText('사유: 예산 부담')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(onReopen).toHaveBeenCalledTimes(1);
  });

  it('shows the cohort week badge only when asked', () => {
    const hidden = renderCard();
    expect(screen.queryByText(/주차/)).toBeNull();
    hidden.unmount();

    renderCard({ showWeekBadge: true });
    expect(screen.getByText('26년 08월 03주차')).toBeTruthy();
  });

  describe('메모', () => {
    it('renders the saved memo in the textarea', () => {
      renderCard({ target: target('2', { memo: '학부모 통화 예정' }), onMemoSave: vi.fn() });
      const box = screen.getByPlaceholderText('메모...') as HTMLTextAreaElement;
      expect(box.value).toBe('학부모 통화 예정');
    });

    it('saves the memo on blur when it changed', () => {
      const onMemoSave = vi.fn();
      renderCard({ stage: '2', onMemoSave });

      const box = screen.getByPlaceholderText('메모...');
      fireEvent.change(box, { target: { value: '9/3 재통화' } });
      fireEvent.blur(box);

      expect(onMemoSave).toHaveBeenCalledWith('9/3 재통화');
    });

    it('does not save when the memo is untouched', () => {
      const onMemoSave = vi.fn();
      renderCard({ target: target('2', { memo: '기존 메모' }), onMemoSave });

      fireEvent.blur(screen.getByPlaceholderText('메모...'));
      expect(onMemoSave).not.toHaveBeenCalled();
    });

    it('reverts the draft on Escape without saving', () => {
      const onMemoSave = vi.fn();
      renderCard({ target: target('2', { memo: '기존 메모' }), onMemoSave });

      const box = screen.getByPlaceholderText('메모...') as HTMLTextAreaElement;
      fireEvent.change(box, { target: { value: '수정 중' } });
      fireEvent.keyDown(box, { key: 'Escape' });

      expect(box.value).toBe('기존 메모');
      expect(onMemoSave).not.toHaveBeenCalled();
    });

    it('does not open the student panel when the memo box is clicked', () => {
      const onClick = vi.fn();
      renderCard({ stage: '2', onClick, onMemoSave: vi.fn() });

      fireEvent.click(screen.getByPlaceholderText('메모...'));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('locks the memo to read-only on a carried card — 이월된 행은 종결이다', () => {
      renderCard({
        target: target('2', { carried_to_week: '2026-08-31', memo: '지난주 컨택 메모' }),
        onMemoSave: vi.fn(),
      });
      expect(screen.queryByPlaceholderText('메모...')).toBeNull();
      expect(screen.getByText('지난주 컨택 메모')).toBeTruthy();
    });

    it('hides the memo box on the drag overlay', () => {
      renderCard({ stage: '2', onMemoSave: vi.fn(), overlay: true });
      expect(screen.queryByPlaceholderText('메모...')).toBeNull();
    });

    it('shows the memo read-only when no save handler is given', () => {
      renderCard({ target: target('4', { memo: '결제 완료 메모' }) });
      expect(screen.queryByPlaceholderText('메모...')).toBeNull();
      expect(screen.getByText('결제 완료 메모')).toBeTruthy();
    });
  });

  it('opens the student panel when the card body is clicked', () => {
    const onClick = vi.fn();
    renderCard({ onClick });
    fireEvent.click(screen.getByText('김학생'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows quality toggles only when onEditQuality is provided (terminal stages)', () => {
    const open = renderCard({ target: target('2'), onDrop: vi.fn() });
    expect(screen.queryByRole('button', { name: '좋은 재결제' })).toBeNull();
    expect(screen.queryByRole('button', { name: '좋은 이탈' })).toBeNull();
    open.unmount();

    renderCard({ target: target('4'), onEditQuality: vi.fn() });
    expect(screen.getByRole('button', { name: '좋은 재결제' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '나쁜 재결제' })).toBeTruthy();
  });

  it('labels the same value differently on 결제 완료 and 미전환', () => {
    const paid = renderCard({ target: target('4'), onEditQuality: vi.fn() });
    expect(screen.getByRole('button', { name: '좋은 재결제' })).toBeTruthy();
    paid.unmount();

    renderCard({ target: target('5'), onEditQuality: vi.fn() });
    expect(screen.getByRole('button', { name: '좋은 이탈' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '나쁜 이탈' })).toBeTruthy();
  });

  it('emits the clicked quality so the editor can open', () => {
    const onEditQuality = vi.fn();
    renderCard({ target: target('4'), onEditQuality });
    fireEvent.click(screen.getByRole('button', { name: '나쁜 재결제' }));
    expect(onEditQuality).toHaveBeenCalledWith('bad');
  });

  it('이미 선택된 값을 눌러도 편집을 연다 — 사유를 나중에 채우는 경로', () => {
    // 118 도입 시점에 사유 없이 품질만 찍힌 행들이 있어, 재클릭이 해제였다면
    // 사유를 채워 넣을 방법이 없다.
    const onEditQuality = vi.fn();
    renderCard({ target: target('4', { outcome_quality: 'good' }), onEditQuality });
    const good = screen.getByRole('button', { name: '좋은 재결제' });
    expect(good.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(good);
    expect(onEditQuality).toHaveBeenCalledWith('good');
  });

  it('사유가 있으면 태그와 메모를 보여준다', () => {
    renderCard({
      target: target('4', {
        outcome_quality: 'bad',
        outcome_reason_tag: '할인·조건 요구',
        outcome_reason_note: '20% 깎아달라고 함',
      }),
      onEditQuality: vi.fn(),
    });
    expect(screen.getByText('사유: 할인·조건 요구 · 20% 깎아달라고 함')).toBeTruthy();
  });

  it('품질만 있고 사유가 없으면 미기재를 눈에 띄게 알린다', () => {
    renderCard({ target: target('5', { outcome_quality: 'bad' }), onEditQuality: vi.fn() });
    const badge = screen.getByText('사유 미기재');
    expect(badge.className).toContain('text-amber-600');
  });

  it('품질이 없으면 사유 줄 자체가 없다', () => {
    renderCard({ target: target('4'), onEditQuality: vi.fn() });
    expect(screen.queryByText(/사유/)).toBeNull();
  });

  it('hides quality toggles on the drag overlay', () => {
    renderCard({ target: target('4', { outcome_quality: 'good' }), onEditQuality: vi.fn(), overlay: true });
    expect(screen.queryByRole('button', { name: '좋은 재결제' })).toBeNull();
  });

  it('이월된 카드는 액션을 전부 감추고 이월 주차를 알린다', () => {
    renderCard({
      target: target('2', { carried_to_week: '2026-08-31' }),
      onDrop: vi.fn(),
      onRemove: vi.fn(),
    });
    expect(screen.getByText('26년 09월 01주차로 이월됨')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '미전환' })).toBeNull();
    expect(screen.queryByRole('button', { name: '제외' })).toBeNull();
  });

  it('이월돼 들어온 카드는 출처 주차를 보여주되 액션은 그대로 쓴다', () => {
    renderCard({
      target: target('2', { carried_from_week: '2026-08-24' }),
      onDrop: vi.fn(),
    });
    expect(screen.getByText('26년 08월 04주차부터 이월')).toBeTruthy();
    expect(screen.getByRole('button', { name: '미전환' })).toBeTruthy();
  });

  it('이월된 결제 대기 카드는 결제 버튼도 사라진다', () => {
    renderCard({
      target: target('3', { carried_to_week: '2026-08-31' }),
      onPayment: vi.fn(),
      onDrop: vi.fn(),
    });
    expect(screen.queryByRole('button', { name: '결제' })).toBeNull();
  });
});
