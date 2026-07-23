import { describe, it, expect } from 'vitest';
import { buildHealthSnapshot } from '../strategy-health';
import { aggregateChurn } from '../churn-breakdown';

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

describe('buildHealthSnapshot — 이탈 사유 반영', () => {
  const bareCurrent = stats({ by_source: [], stage_flow: [] });

  it('churn 미지정이면 summaryText에 이탈 섹션이 없고 churn 신호도 없다', () => {
    const snap = buildHealthSnapshot(input(bareCurrent));
    expect(snap.summaryText).not.toContain('이탈 사유 분석');
    expect(snap.signals.every((s) => s.category !== 'churn')).toBe(true);
  });

  it('churn 지정 시 summaryText에 이탈 사유 섹션·분포·대표 사유가 들어간다', () => {
    const churn = aggregateChurn([
      { churn_tag: '미결제: 콜 무응답', churn_type: 'potential' },
      { churn_tag: '미결제: 보류', churn_type: 'closed' },
      { churn_tag: '회신 없음: 무응답', churn_type: 'closed' },
      { churn_tag: '환불: 잔여 환불', churn_type: 'closed' },
      { churn_tag: '미응시: 미진행', churn_type: 'potential' },
      { churn_tag: '미결제: 취소', churn_type: 'closed' },
    ]);
    const snap = buildHealthSnapshot({ ...input(bareCurrent), churn });
    expect(snap.summaryText).toContain('이탈 사유 분석');
    expect(snap.summaryText).toContain('미결제 3');
    expect(snap.summaryText).toContain('콜 무응답');
  });

  it('최다 사유가 크게 쏠리면 category=churn 신호를 낸다', () => {
    // 이탈 6명, 미결제 4/6(66%) → churnTopShareCrit(0.5) 초과 → critical
    const churn = aggregateChurn([
      { churn_tag: '미결제: a', churn_type: 'closed' },
      { churn_tag: '미결제: b', churn_type: 'closed' },
      { churn_tag: '미결제: c', churn_type: 'closed' },
      { churn_tag: '미결제: d', churn_type: 'closed' },
      { churn_tag: '환불: e', churn_type: 'closed' },
      { churn_tag: '회신 없음: f', churn_type: 'closed' },
    ]);
    const snap = buildHealthSnapshot({ ...input(bareCurrent), churn });
    const sig = snap.signals.find((s) => s.category === 'churn');
    expect(sig).toBeDefined();
    expect(sig!.severity).toBe('critical');
    expect(sig!.area).toContain('미결제');
  });

  it('이탈 코호트가 표본 게이트(5) 미만이면 churn 신호를 내지 않는다', () => {
    const churn = aggregateChurn([
      { churn_tag: '미결제: a', churn_type: 'closed' },
      { churn_tag: '미결제: b', churn_type: 'closed' },
    ]);
    const snap = buildHealthSnapshot({ ...input(bareCurrent), churn });
    expect(snap.signals.every((s) => s.category !== 'churn')).toBe(true);
    // 신호는 없어도 summaryText 이탈 섹션은 노출(맥락 제공)
    expect(snap.summaryText).toContain('이탈 사유 분석');
  });
});
