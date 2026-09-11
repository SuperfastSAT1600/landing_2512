import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChannelHealthTable from '../ChannelHealthTable';
import { weeklyStats, zeroCounts } from './fixtures';

function rowOf(channel: string) {
  const row = screen.getByText(channel).closest('tr');
  if (!row) throw new Error(`row not found: ${channel}`);
  return row;
}

// REQ-007: 채널별 현황 — 주차 목표는 총합만 있으므로 판정은 기대치 기준
describe('ChannelHealthTable', () => {
  it('목표 열을 두지 않는다 (목표는 목표 탭에서 관리)', () => {
    render(<ChannelHealthTable weekly={weeklyStats()} />);
    expect(screen.queryByRole('columnheader', { name: '목표' })).toBeNull();
    expect(screen.getByRole('columnheader', { name: '기대치' })).toBeTruthy();
  });

  it('기대치 기준으로 판정한다', () => {
    render(
      <ChannelHealthTable
        weekly={weeklyStats({
          this_week: zeroCounts({ META: 9 }),
          hist_weekly_avg: zeroCounts({ META: 9.2 }),
        })}
      />
    );
    expect(rowOf('META').textContent).toContain('🟢'); // 9 / 9.2 = 98%
  });

  it('기대치에 크게 미달하면 빨간 판정이다', () => {
    render(
      <ChannelHealthTable
        weekly={weeklyStats({
          this_week: zeroCounts({ META: 2 }),
          hist_weekly_avg: zeroCounts({ META: 9.2 }),
        })}
      />
    );
    expect(rowOf('META').textContent).toContain('🔴');
  });

  it('기대치가 0 이면 판정하지 않는다', () => {
    render(<ChannelHealthTable weekly={weeklyStats({ this_week: zeroCounts({ B2B: 3 }) })} />);
    expect(rowOf('B2B').textContent).toContain('—');
  });

  it('차이는 기대치 대비로 계산한다', () => {
    render(
      <ChannelHealthTable
        weekly={weeklyStats({
          this_week: zeroCounts({ META: 4 }),
          hist_weekly_avg: zeroCounts({ META: 9.2 }),
        })}
      />
    );
    expect(rowOf('META').textContent).toContain('-5.2');
  });

  it('6개 채널을 모두 렌더한다', () => {
    render(<ChannelHealthTable weekly={weeklyStats()} />);
    for (const g of ['네이버 SEO', '구글 SEO', 'META', 'Youtube 광고', '소개', 'B2B']) {
      expect(screen.getByText(g)).toBeTruthy();
    }
  });
});
