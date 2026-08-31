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
    outcome_quality: null,
    outcome_reason_tag: null,
    outcome_reason_note: null,
    carried_to_week: null,
    carried_from_week: null,
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

  it('surfaces 미분류 in cohort scope only while terminal rows are untagged (REQ-008)', () => {
    const { unmount } = render(
      <RenewalStatsStrip
        scopeLabel="26년 08월 04주차"
        mode="cohort"
        targets={[
          target('4', 'a'),
          { ...target('4', 'b'), outcome_quality: 'good' as const },
          target('5', 'c'),
          target('2', 'd'),
        ]}
      />
    );
    // 4·5 중 품질이 없는 두 건만 센다 — 2단계는 애초에 분류 대상이 아니다.
    expect(metric('미분류')).toBe('2');
    unmount();

    render(
      <RenewalStatsStrip
        scopeLabel="26년 08월 04주차"
        mode="cohort"
        targets={[
          { ...target('4', 'a'), outcome_quality: 'good' as const },
          { ...target('5', 'b'), outcome_quality: 'bad' as const },
        ]}
      />
    );
    expect(screen.queryByTestId('renewal-metric-미분류')).toBeNull();
  });

  it('never shows 미분류 in open scope — 4·5 rows cannot appear there', () => {
    render(
      <RenewalStatsStrip
        scopeLabel="진행 중 전체"
        mode="open"
        targets={[target('1', 'a'), target('3', 'b')]}
      />
    );
    expect(screen.queryByTestId('renewal-metric-미분류')).toBeNull();
  });

  it('이월된 행을 진행 중에서 빼고 이월 개수를 따로 센다', () => {
    render(
      <RenewalStatsStrip
        scopeLabel="26년 08월 04주차"
        mode="cohort"
        targets={[
          target('4', 'a'),
          { ...target('2', 'b'), carried_to_week: '2026-08-31' },
          { ...target('3', 'c'), carried_to_week: '2026-08-31' },
          target('2', 'd'),
        ]}
      />
    );
    expect(metric('선정')).toBe('4'); // 분모는 보존
    expect(metric('진행 중')).toBe('1'); // 이월 2건 제외
    expect(metric('결제 대기')).toBe('0'); // 이월된 3단계도 제외
    expect(metric('이월')).toBe('2');
  });

  it('이월이 없으면 이월 메트릭을 숨긴다', () => {
    render(
      <RenewalStatsStrip scopeLabel="26년 08월 04주차" mode="cohort" targets={[target('4', 'a')]} />
    );
    expect(screen.queryByTestId('renewal-metric-이월')).toBeNull();
  });
});
