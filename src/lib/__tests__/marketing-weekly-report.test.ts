import { describe, it, expect } from 'vitest';
import { lastCompletedWeekStart, formatMarketingGoalReport } from '../marketing-weekly-report';
import type { MarketingGroup } from '@/lib/marketing-groups';
import type { WeeklyGoalRow } from '../marketing-goals';

const ALL = ['네이버 SEO', '구글 SEO', 'META', '소개', 'B2B', '미분류'];

function row(target: number | null, actuals: Partial<Record<MarketingGroup, number>>): WeeklyGoalRow {
  const a = Object.fromEntries(ALL.map((k) => [k, actuals[k as MarketingGroup] ?? 0])) as Record<MarketingGroup, number>;
  const total = ALL.reduce((sum, k) => sum + a[k as MarketingGroup], 0);
  return {
    week_start: '2026-08-24',
    week_end: '2026-08-30',
    week_label: '26년 08월 04주차',
    target,
    actuals: a,
    actual_total: total,
    achievement_rate: target ? Math.round((total / target) * 100) : null,
  };
}

// REQ-010: 직전 완료 주차 계산
describe('lastCompletedWeekStart', () => {
  it('월요일 04:00 KST 실행 시 직전 주 월요일을 낸다', () => {
    // 2026-08-31(월) 04:00 KST = 2026-08-30(일) 19:00 UTC — Vercel 크론 발사 시점
    expect(lastCompletedWeekStart(new Date('2026-08-30T19:00:00Z'))).toBe('2026-08-24');
  });

  it('주중에 실행해도 직전 완료 주차를 낸다', () => {
    expect(lastCompletedWeekStart(new Date('2026-09-03T09:00:00Z'))).toBe('2026-08-24');
  });

  it('일요일 23:59 KST 에는 아직 그 주가 끝나지 않았다', () => {
    expect(lastCompletedWeekStart(new Date('2026-08-30T14:59:00Z'))).toBe('2026-08-17');
  });

  it('연말 경계를 넘는다', () => {
    expect(lastCompletedWeekStart(new Date('2027-01-03T19:00:00Z'))).toBe('2026-12-28');
  });
});

// REQ-010: 슬랙 메시지 포맷 — 총합 목표 + 소스별 건수·비중
describe('formatMarketingGoalReport', () => {
  it('목표 대비와 유입 소스를 낸다', () => {
    const text = formatMarketingGoalReport(
      row(20, { '네이버 SEO': 1, '구글 SEO': 6, META: 8, 소개: 3, B2B: 1 })
    );

    expect(text).toBe(
      [
        '*마케팅 주간 리드 · 26년 08월 04주차*',
        '2026-08-24 ~ 2026-08-30',
        '',
        '*목표 대비*',
        '목표 20개 / 실적 19개 (95%)',
        '',
        '*유입 소스*',
        '네이버 SEO 1개 (5.3%)',
        '구글 SEO 6개 (31.6%)',
        'META 8개 (42.1%)',
        '소개 3개 (15.8%)',
        'B2B 1개 (5.3%)',
      ].join('\n')
    );
  });

  it('인입이 없는 채널을 마지막에 한 줄로 모은다', () => {
    const text = formatMarketingGoalReport(row(20, { META: 19 }));
    expect(text).toContain('META 19개 (100.0%)');
    expect(text).toContain('인입 없음: 네이버 SEO, 구글 SEO, 소개, B2B');
  });

  it('목표 미설정이면 실적만 낸다', () => {
    const text = formatMarketingGoalReport(row(null, { META: 5 }));
    expect(text).toContain('목표 미설정 / 실적 5개');
    expect(text).not.toContain('NaN');
    expect(text).not.toContain('Infinity');
  });

  it('목표 0 은 달성률을 계산하지 않는다 (0 나눗셈 방지)', () => {
    const text = formatMarketingGoalReport(row(0, { META: 3 }));
    expect(text).toContain('목표 0개 / 실적 3개 (—)');
  });

  it('인입이 아예 없으면 소스 블록에 인입 없음만 낸다', () => {
    const text = formatMarketingGoalReport(row(20, {}));
    expect(text).toContain('목표 20개 / 실적 0개 (0%)');
    expect(text).toContain('*유입 소스*\n인입 없음');
  });

  it('미분류 실적도 소스에 포함한다', () => {
    const text = formatMarketingGoalReport(row(10, { META: 3, 미분류: 1 }));
    expect(text).toContain('미분류 1개 (25.0%)');
  });

  it('소스별 목표는 넣지 않는다', () => {
    const text = formatMarketingGoalReport(row(20, { META: 8 }));
    expect(text).not.toContain('META 목표');
    expect(text).not.toContain('목표 미설정 / 실적 8');
  });

  it('이모지와 논평을 넣지 않는다', () => {
    const text = formatMarketingGoalReport(row(20, { META: 4 }));
    expect(text).not.toMatch(/[🟢🟡🔴⚠️📊]/u);
    expect(text).not.toMatch(/좋|나쁘|주의|필요합니다/);
  });
});
