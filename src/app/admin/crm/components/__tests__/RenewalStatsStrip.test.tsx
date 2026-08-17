import { render, screen } from '@testing-library/react';
import { RenewalStatsStrip, formatRate } from '../RenewalStatsStrip';
import type { RenewalStage, RenewalTarget } from '@/types/crm';

function target(stage: RenewalStage, studentId = `s-${stage}`): RenewalTarget {
  return {
    id: `t-${stage}-${studentId}`,
    student_id: studentId,
    week_start: '2026-08-10',
    stage,
    stage_updated_at: '2026-08-10T00:00:00Z',
    converted_payment_id: null,
    drop_reason: null,
    created_by: null,
    created_at: '2026-08-10T00:00:00Z',
    updated_at: '2026-08-10T00:00:00Z',
  };
}

/** '선정 12' 형태의 인라인 항목에서 값만 뽑는다. */
function metric(label: string): string {
  const el = screen.getByTestId(`renewal-metric-${label}`);
  return el.textContent ?? '';
}

describe('formatRate', () => {
  it('renders a dash when there is nothing to divide by', () => {
    expect(formatRate(0, 0)).toBe('-');
  });

  it('rounds to one decimal and drops a trailing zero', () => {
    expect(formatRate(5, 12)).toBe('41.7%');
    expect(formatRate(1, 2)).toBe('50%');
    expect(formatRate(1, 3)).toBe('33.3%');
    expect(formatRate(0, 4)).toBe('0%');
    expect(formatRate(4, 4)).toBe('100%');
  });
});

describe('RenewalStatsStrip', () => {
  it('renders zeros and a dash conversion rate with no targets', () => {
    render(<RenewalStatsStrip targets={[]} scopeLabel="26년 08월 02주차" mode="cohort" />);
    expect(metric('선정')).toBe('0');
    expect(metric('진행 중')).toBe('0');
    expect(metric('결제 대기')).toBe('0');
    expect(metric('결제 완료')).toBe('0');
    expect(metric('미전환')).toBe('0');
    expect(metric('전환율')).toBe('-');
  });

  it('counts each stage and derives the conversion rate over 선정 인원', () => {
    render(
      <RenewalStatsStrip
        scopeLabel="26년 08월 02주차"
        mode="cohort"
        targets={[
          target('1', 'a'),
          target('2', 'b'),
          target('3', 'c'),
          target('4', 'd'),
          target('5', 'e'),
        ]}
      />
    );
    expect(metric('선정')).toBe('5');
    expect(metric('진행 중')).toBe('3');
    expect(metric('결제 대기')).toBe('1');
    expect(metric('결제 완료')).toBe('1');
    expect(metric('미전환')).toBe('1');
    expect(metric('전환율')).toBe('20%');
  });

  it('keeps 미전환 in the conversion denominator', () => {
    render(
      <RenewalStatsStrip
        scopeLabel="26년 08월 02주차"
        mode="cohort"
        targets={[target('4', 'a'), target('5', 'b'), target('5', 'c'), target('5', 'd')]}
      />
    );
    expect(metric('선정')).toBe('4');
    expect(metric('전환율')).toBe('25%');
  });

  it('shows the scope label so the numbers are unambiguous', () => {
    render(<RenewalStatsStrip targets={[]} scopeLabel="26년 08월 03주차" mode="cohort" />);
    expect(screen.getByText('26년 08월 03주차')).toBeTruthy();
  });

  it('hides 전환율 and 결제 완료 in open scope — those stages cannot appear there', () => {
    render(
      <RenewalStatsStrip
        scopeLabel="진행 중 전체"
        mode="open"
        targets={[target('1', 'a'), target('1', 'b'), target('2', 'c'), target('3', 'd')]}
      />
    );
    expect(metric('진행 중')).toBe('4');
    expect(metric('최초 컨택 전')).toBe('2');
    expect(metric('컨택 중')).toBe('1');
    expect(metric('결제 대기')).toBe('1');
    expect(screen.queryByTestId('renewal-metric-전환율')).toBeNull();
    expect(screen.queryByTestId('renewal-metric-결제 완료')).toBeNull();
    expect(screen.queryByTestId('renewal-metric-선정')).toBeNull();
  });
});
