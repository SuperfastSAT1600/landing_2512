import { describe, it, expect } from 'vitest';
import { buildHealthSnapshot } from '../strategy-health';

type HealthInput = Parameters<typeof buildHealthSnapshot>[0];
type Stats = HealthInput['current'];

function source(p: Partial<Stats['by_source'][number]>): Stats['by_source'][number] {
  return {
    source: 'src',
    leads: 10,
    contacted: 8,
    contact_rate: 80,
    paid: 2,
    conversion_rate: 25,
    revenue: 0,
    net_revenue: 0,
    avg_first_response_seconds: 600,
    ...p,
  } as Stats['by_source'][number];
}

function stats(p: Partial<Stats>): Stats {
  return {
    overview: { total_leads: 100, contacted: 60, contact_rate: 60, paid: 20, conversion_rate: 33, gross_revenue: 10_000_000 },
    by_source: [],
    stage_flow: [],
    monthly: [],
    weekly: [],
    ...p,
  } as unknown as Stats;
}

const input = (current: Stats): HealthInput => ({
  current,
  previous: stats({ overview: { total_leads: 2, contacted: 1, contact_rate: 50, paid: 0, conversion_rate: 0, gross_revenue: 0 } as Stats['overview'] }),
  stalled: [],
  periodDays: 20,
});

describe('buildHealthSnapshot — weakest 5개 채우기', () => {
  it('실신호 3개 + 관찰 후보 2개 = weakest 5개로 채운다', () => {
    const current = stats({
      by_source: [
        // 3개 critical 컨택 신호만 (contact_rate < 30, contacted < 3 → 전환 신호는 생기지 않음)
        source({ source: '인스타', leads: 21, contacted: 2, contact_rate: 19, conversion_rate: 0 }),
        source({ source: '네이버', leads: 15, contacted: 2, contact_rate: 20, conversion_rate: 0 }),
        source({ source: '유튜브', leads: 10, contacted: 2, contact_rate: 25, conversion_rate: 0 }),
        // 2개 건강한 채널 (임계 미달 아님) → 관찰 후보로 채워짐
        source({ source: '블로그', leads: 12, contacted: 10, contact_rate: 83, conversion_rate: 12 }),
        source({ source: '추천', leads: 8, contacted: 7, contact_rate: 88, conversion_rate: 18 }),
      ],
    });
    const snap = buildHealthSnapshot(input(current));
    expect(snap.weakest.length).toBe(5);
    // 관찰 후보가 포함됐는지
    expect(snap.weakest.some((s) => s.area.includes('관찰'))).toBe(true);
  });

  it('실신호가 충분(5개+)하면 관찰 후보를 넣지 않는다', () => {
    const current = stats({
      by_source: [
        source({ source: '인스타', leads: 21, contacted: 4, contact_rate: 19, conversion_rate: 3 }),
        source({ source: '네이버', leads: 15, contacted: 3, contact_rate: 20, conversion_rate: 2 }),
        source({ source: '유튜브', leads: 10, contacted: 2, contact_rate: 25, conversion_rate: 4 }),
        source({ source: '카카오', leads: 9, contacted: 2, contact_rate: 22, conversion_rate: 3 }),
        source({ source: '구글', leads: 11, contacted: 3, contact_rate: 27, conversion_rate: 4 }),
        source({ source: '틱톡', leads: 7, contacted: 1, contact_rate: 14, conversion_rate: 2 }),
      ],
    });
    const snap = buildHealthSnapshot(input(current));
    expect(snap.weakest.length).toBe(5);
    expect(snap.weakest.every((s) => !s.area.includes('관찰'))).toBe(true);
  });

  it('데이터가 적으면(채울 후보 없음) 5개 미만일 수 있다', () => {
    const current = stats({
      by_source: [source({ source: '인스타', leads: 21, contacted: 4, contact_rate: 19, conversion_rate: 3 })],
    });
    const snap = buildHealthSnapshot(input(current));
    expect(snap.weakest.length).toBeLessThanOrEqual(5);
    expect(snap.weakest.length).toBeGreaterThanOrEqual(1);
  });
});
