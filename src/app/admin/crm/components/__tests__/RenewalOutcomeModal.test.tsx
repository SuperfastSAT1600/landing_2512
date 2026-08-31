import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RenewalOutcomeModal } from '../RenewalOutcomeModal';
import { RenewalDropModal } from '../RenewalDropModal';
import type { RenewalStage, RenewalTarget } from '@/types/crm';

function target(stage: RenewalStage, over: Partial<RenewalTarget> = {}): RenewalTarget {
  return {
    id: 'rt-1',
    student_id: 's-1',
    week_start: '2026-08-31',
    stage,
    stage_updated_at: '2026-08-31T00:00:00Z',
    converted_payment_id: null,
    drop_reason: null,
    outcome_quality: null,
    outcome_reason_tag: null,
    outcome_reason_note: null,
    carried_to_week: null,
    carried_from_week: null,
    created_by: null,
    created_at: '2026-08-31T00:00:00Z',
    updated_at: '2026-08-31T00:00:00Z',
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

function reasonOptions(): string[] {
  const select = screen.getByLabelText('사유') as HTMLSelectElement;
  return Array.from(select.options)
    .map((o) => o.value)
    .filter(Boolean);
}

describe('RenewalOutcomeModal (REQ-006)', () => {
  it('사유를 고르기 전엔 저장할 수 없다', () => {
    const onConfirm = vi.fn();
    render(
      <RenewalOutcomeModal
        target={target('4')}
        initialQuality="bad"
        onConfirm={onConfirm}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const save = screen.getByRole('button', { name: '저장' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(save);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('누른 품질이 미리 선택되고 그 품질의 사유만 보인다', () => {
    render(
      <RenewalOutcomeModal
        target={target('4')}
        initialQuality="bad"
        onConfirm={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: '나쁜 재결제' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(reasonOptions()).toContain('할인·조건 요구');
    expect(reasonOptions()).not.toContain('성적 향상');
  });

  it('품질을 바꾸면 사유 목록이 통째로 바뀌고 이전 선택은 비워진다', () => {
    render(
      <RenewalOutcomeModal
        target={target('4')}
        initialQuality="bad"
        onConfirm={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText('사유'), { target: { value: '할인·조건 요구' } });
    fireEvent.click(screen.getByRole('button', { name: '좋은 재결제' }));

    expect((screen.getByLabelText('사유') as HTMLSelectElement).value).toBe('');
    expect(reasonOptions()).toContain('성적 향상');
    expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('저장하면 품질·사유·메모를 함께 넘긴다', () => {
    const onConfirm = vi.fn();
    render(
      <RenewalOutcomeModal
        target={target('4')}
        initialQuality="bad"
        onConfirm={onConfirm}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText('사유'), { target: { value: '단기만 결제' } });
    fireEvent.change(screen.getByPlaceholderText(/할인 요구/), {
      target: { value: '1개월만 하겠다고 함' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(onConfirm).toHaveBeenCalledWith({
      quality: 'bad',
      reasonTag: '단기만 결제',
      reasonNote: '1개월만 하겠다고 함',
    });
  });

  it('이미 저장된 사유를 이어받아 수정할 수 있다', () => {
    render(
      <RenewalOutcomeModal
        target={target('5', { outcome_quality: 'bad', outcome_reason_tag: '타학원 이전' })}
        initialQuality="bad"
        onConfirm={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect((screen.getByLabelText('사유') as HTMLSelectElement).value).toBe('타학원 이전');
  });

  it('선택 해제는 이미 품질이 있을 때만 뜬다', () => {
    const onClear = vi.fn();
    const blank = render(
      <RenewalOutcomeModal
        target={target('4')}
        initialQuality="good"
        onConfirm={vi.fn()}
        onClear={onClear}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: '선택 해제' })).toBeNull();
    blank.unmount();

    render(
      <RenewalOutcomeModal
        target={target('4', { outcome_quality: 'good', outcome_reason_tag: '성적 향상' })}
        initialQuality="good"
        onConfirm={vi.fn()}
        onClear={onClear}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '선택 해제' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('미전환 카드는 이탈 문구와 이탈 사유를 쓴다', () => {
    render(
      <RenewalOutcomeModal
        target={target('5')}
        initialQuality="good"
        onConfirm={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: '좋은 이탈' })).toBeTruthy();
    expect(reasonOptions()).toContain('목표 점수 달성');
  });
});

describe('RenewalDropModal (REQ-007)', () => {
  it('이탈 유형을 고르기 전엔 사유를 못 고르고 처리도 못 한다', () => {
    render(<RenewalDropModal target={target('3')} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect((screen.getByLabelText('사유') as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '미전환 처리' }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it('좋은 이탈과 나쁜 이탈의 사유가 서로 다르다', () => {
    render(<RenewalDropModal target={target('3')} onConfirm={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '좋은 이탈' }));
    expect(reasonOptions()).toContain('목표 점수 달성');
    expect(reasonOptions()).not.toContain('예산 부담');

    fireEvent.click(screen.getByRole('button', { name: '나쁜 이탈' }));
    expect(reasonOptions()).toContain('예산 부담');
    expect(reasonOptions()).not.toContain('목표 점수 달성');
  });

  it('처리하면 품질·사유·메모를 분리해 넘긴다', () => {
    const onConfirm = vi.fn();
    render(<RenewalDropModal target={target('3')} onConfirm={onConfirm} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '나쁜 이탈' }));
    fireEvent.change(screen.getByLabelText('사유'), { target: { value: '응답 없음' } });
    fireEvent.click(screen.getByRole('button', { name: '미전환 처리' }));
    expect(onConfirm).toHaveBeenCalledWith({
      quality: 'bad',
      reasonTag: '응답 없음',
      reasonNote: '',
    });
  });
});
