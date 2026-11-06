/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { StrategyStats } from '../StrategyStats';
import { getPresetRange } from '../stats-primitives';
import type { PerStrategyRow, StrategyTypeStats } from '@/lib/strategy-stats';

const strategyRow: PerStrategyRow = {
  strategy_id: 's1', strategy_name: '개인화 메시지',
  assigned: 0, touched: 0, contacted: 0, contact_rate: 0, paid: 0,
  conversion_rate: 0, conversion_rate_of_assigned: 0, revenue: 0, net_revenue: 0,
  avg_days_to_convert: null, stage_flow: [],
};

const stats = {
  period: { from: '2026-06-01', to: '2026-11-30' },
  rollup: {},
  by_strategy: [strategyRow],
  transitions: [{
    planned_id: 's1', planned_name: '개인화 메시지', applied_id: 's2', applied_name: '바로 상담 전화 진행',
    leads: 3, paid: 1, rate: 33, changed: true,
  }],
} as unknown as StrategyTypeStats;

function json(data: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve({ data }) } as Response);
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.startsWith('/api/crm/strategy-categories')) return json([{ id: 'c1', name: '컨택 전략', sort_order: 0 }]);
    if (url.startsWith('/api/crm/strategy-stats')) return json(stats);
    return json([]);
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe('StrategyStats', () => {
  it("'계획 → 실제 전환' 패널은 보이지 않고 전략 목록은 보인다", async () => {
    render(<StrategyStats adminKey="k" />);
    await waitFor(() => expect(screen.getAllByText('개인화 메시지').length).toBeGreaterThan(0));
    expect(screen.queryByText(/계획 → 실제 전환/)).toBeNull();
    expect(screen.queryByText('바로 상담 전화 진행')).toBeNull();
  });

  it("처음 열면 '이번 달' 기간으로 조회한다", async () => {
    render(<StrategyStats adminKey="k" />);
    const { from, to } = getPresetRange('this_month');
    await waitFor(() => {
      const urls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
      const statsUrl = urls.find((u) => u.startsWith('/api/crm/strategy-stats?'));
      expect(statsUrl).toBeDefined();
      const qs = new URLSearchParams(statsUrl!.split('?')[1]);
      expect(qs.get('from')).toBe(from);
      expect(qs.get('to')).toBe(to);
    });
    expect(screen.getByRole('button', { name: '이번 달' }).className).toContain('bg-gray-900');
  });
});
