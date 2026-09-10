import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeroWidget from '../HeroWidget';
import { weeklyStats, zeroCounts } from './fixtures';

const noop = () => {};

// REQ-006: 히어로 위젯 목표 미설정 처리
describe('HeroWidget — 목표 미설정', () => {
  it('"목표 미설정"을 렌더하고 목표 개수를 꾸며내지 않는다', () => {
    render(
      <HeroWidget
        weekly={weeklyStats({ weekly_target: null, this_week_total: 6 })}
        onAddSpend={noop}
        onSetGoal={noop}
      />
    );
    expect(screen.getByText('목표 미설정')).toBeTruthy();
    expect(screen.queryByText(/개 목표/)).toBeNull();
    expect(screen.queryByText(/개 남음/)).toBeNull();
  });

  it('진행률 바를 그리지 않는다 (0% 빨간 바를 미달로 오독하지 않게)', () => {
    render(
      <HeroWidget
        weekly={weeklyStats({ weekly_target: null, this_week_total: 6 })}
        onAddSpend={noop}
        onSetGoal={noop}
      />
    );
    expect(screen.queryByTestId('goal-progress')).toBeNull();
  });

  it('목표 대비 페이스 문구 대신 주말 예상만 보여준다', () => {
    render(
      <HeroWidget
        weekly={weeklyStats({ weekly_target: null, this_week_total: 6, pace_prediction: 10 })}
        onAddSpend={noop}
        onSetGoal={noop}
      />
    );
    expect(screen.getByText(/주말 예상 10개/)).toBeTruthy();
    expect(screen.queryByText(/목표 미달 예상/)).toBeNull();
    expect(screen.queryByText(/목표 달성 페이스/)).toBeNull();
  });

  it('목표 설정 버튼이 콜백을 호출한다', () => {
    const onSetGoal = vi.fn();
    render(
      <HeroWidget weekly={weeklyStats({ weekly_target: null })} onAddSpend={noop} onSetGoal={onSetGoal} />
    );
    screen.getByRole('button', { name: '목표 설정' }).click();
    expect(onSetGoal).toHaveBeenCalledTimes(1);
  });

  it('리드 수는 목표와 무관하게 그대로 보여준다', () => {
    render(
      <HeroWidget
        weekly={weeklyStats({ weekly_target: null, this_week_total: 6 })}
        onAddSpend={noop}
        onSetGoal={noop}
      />
    );
    expect(screen.getByText('6')).toBeTruthy();
  });
});

describe('HeroWidget — 목표 설정됨', () => {
  const withGoal = weeklyStats({
    weekly_target: 35,
    this_week_total: 6,
    pace_prediction: 10,
    this_week: zeroCounts({ META: 4, '구글 SEO': 2 }),
  });

  it('목표 개수와 남은 개수를 보여준다', () => {
    render(<HeroWidget weekly={withGoal} onAddSpend={noop} onSetGoal={noop} />);
    expect(screen.getByText('/ 35개 목표')).toBeTruthy();
    expect(screen.getByText('29개 남음')).toBeTruthy();
  });

  it('진행률 바를 그린다', () => {
    render(<HeroWidget weekly={withGoal} onAddSpend={noop} onSetGoal={noop} />);
    expect(screen.getByTestId('goal-progress')).toBeTruthy();
  });

  it('페이스가 목표에 못 미치면 미달 예상으로 판정한다', () => {
    render(<HeroWidget weekly={withGoal} onAddSpend={noop} onSetGoal={noop} />);
    expect(screen.getByText(/목표 미달 예상/)).toBeTruthy();
  });

  it('목표를 채우면 달성으로 표시한다', () => {
    render(
      <HeroWidget
        weekly={weeklyStats({ weekly_target: 5, this_week_total: 6, pace_prediction: 10 })}
        onAddSpend={noop}
        onSetGoal={noop}
      />
    );
    expect(screen.getByText('달성!')).toBeTruthy();
    expect(screen.getByText(/목표 달성 페이스/)).toBeTruthy();
  });

  it('목표가 0 이면 미설정이 아니라 0개 목표로 다룬다', () => {
    render(
      <HeroWidget
        weekly={weeklyStats({ weekly_target: 0, this_week_total: 2 })}
        onAddSpend={noop}
        onSetGoal={noop}
      />
    );
    expect(screen.getByText('/ 0개 목표')).toBeTruthy();
    expect(screen.queryByText('목표 미설정')).toBeNull();
  });
});
