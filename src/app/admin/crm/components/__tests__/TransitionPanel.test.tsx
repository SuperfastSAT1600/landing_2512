/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransitionPanel } from '../strategy-stats/TransitionPanel';
import type { StrategyTransitionRow } from '@/lib/strategy-stats';

const row = (over: Partial<StrategyTransitionRow>): StrategyTransitionRow => ({
  planned_id: 'p', planned_name: '진단 없이 결제 유도',
  applied_id: 'a', applied_name: '연락처 받아 직접 진단',
  leads: 5, paid: 3, rate: 60, changed: true,
  ...over,
});

describe('TransitionPanel', () => {
  it('전환이 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<TransitionPanel transitions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('계획 → 실제 쌍과 지표를 보여준다', () => {
    render(<TransitionPanel transitions={[row({})]} />);
    expect(screen.getByText('진단 없이 결제 유도')).toBeTruthy();
    expect(screen.getByText('연락처 받아 직접 진단')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
  });

  it('계획대로 진행한 줄은 실제 칸을 "계획과 동일"로 접는다', () => {
    render(<TransitionPanel transitions={[row({ changed: false, applied_id: 'p', applied_name: '진단 없이 결제 유도' })]} />);
    expect(screen.getByText('계획과 동일')).toBeTruthy();
    expect(screen.queryByText('변경')).toBeNull();
  });

  it('변경된 줄에는 변경 배지를 단다', () => {
    render(<TransitionPanel transitions={[row({})]} />);
    expect(screen.getByText('변경')).toBeTruthy();
  });

  it('기록이 빠진 쪽은 "기록 없음"으로 드러낸다', () => {
    render(<TransitionPanel transitions={[row({ applied_id: null, applied_name: null, changed: false })]} />);
    expect(screen.getByText('기록 없음')).toBeTruthy();
  });

  it('계획 기록이 없는 줄은 "계획과 동일" 대신 실제 전략명을 보여준다', () => {
    render(
      <TransitionPanel
        transitions={[row({ planned_id: null, planned_name: null, changed: false, applied_name: '개인화 메시지' })]}
      />
    );
    expect(screen.getByText('개인화 메시지')).toBeTruthy();
    expect(screen.queryByText('계획과 동일')).toBeNull();
  });

  it('요약에 유지·변경·미기록 건수를 센다', () => {
    render(
      <TransitionPanel
        transitions={[
          row({ leads: 12, changed: false, applied_id: 'p', applied_name: '진단 없이 결제 유도' }),
          row({ leads: 5, changed: true }),
          row({ leads: 3, applied_id: null, applied_name: null, changed: false }),
        ]}
      />
    );
    expect(screen.getByText(/계획 유지 12/)).toBeTruthy();
    expect(screen.getByText(/변경 5/)).toBeTruthy();
    expect(screen.getByText(/실제 미기록 3/)).toBeTruthy();
  });

  it('헤더를 누르면 접힌다', () => {
    render(<TransitionPanel transitions={[row({})]} />);
    expect(screen.getByText('진단 없이 결제 유도')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /계획 → 실제 전환/ }));
    expect(screen.queryByText('진단 없이 결제 유도')).toBeNull();
  });
});
