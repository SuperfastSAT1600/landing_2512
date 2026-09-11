import { describe, it, expect } from 'vitest';
import { classifyChannelSignals } from '../signalUtils';
import type { WeekRow } from '../groupByPeriod';
import type { MarketingGroup } from '@/lib/marketing-groups';

const ALL_GROUPS: MarketingGroup[] = ['네이버 SEO', '구글 SEO', 'META', '소개', 'B2B', '미분류'];

function makeWeekRow(weekStart: string, channelOverrides: Partial<Record<MarketingGroup, number>>): WeekRow {
  const channels = Object.fromEntries(ALL_GROUPS.map((g) => [g, 0])) as Record<MarketingGroup, number>;
  Object.assign(channels, channelOverrides);
  const total = ALL_GROUPS.reduce((s, g) => s + channels[g], 0);
  return {
    key: weekStart,
    label: weekStart,
    weekStart,
    weekEnd: weekStart,
    channels,
    total,
    mix: Object.fromEntries(ALL_GROUPS.map((g) => [g, 0])) as Record<MarketingGroup, number>,
    spend: 0,
    cpl: null,
  };
}

function zeroActual(overrides: Partial<Record<MarketingGroup, number>> = {}): Record<MarketingGroup, number> {
  return Object.assign(Object.fromEntries(ALL_GROUPS.map((g) => [g, 0])) as Record<MarketingGroup, number>, overrides);
}

describe('classifyChannelSignals', () => {
  it('3주 연속 감소 → warning (목표 없음)', () => {
    const rows = [
      makeWeekRow('2026-08-10', { '네이버 SEO': 30 }),
      makeWeekRow('2026-08-17', { '네이버 SEO': 20 }),
      makeWeekRow('2026-08-24', { '네이버 SEO': 10 }),
    ];
    const actual = zeroActual({ '네이버 SEO': 10 });
    const signals = classifyChannelSignals(rows, null, actual);
    const naver = signals.find((s) => s.channel === '네이버 SEO')!;
    expect(naver.level).toBe('warning');
    expect(naver.reasons).toContain('3주 연속 감소 중');
    expect(naver.reasons).not.toContain(expect.stringMatching(/목표 달성률/));
  });

  it('목표 달성률 40% → danger (3주 연속 감소 + <50%)', () => {
    const rows = [
      makeWeekRow('2026-08-10', { 'META': 30 }),
      makeWeekRow('2026-08-17', { 'META': 20 }),
      makeWeekRow('2026-08-24', { 'META': 10 }),
    ];
    const actual = zeroActual({ 'META': 4 });
    const signals = classifyChannelSignals(rows, 10, actual);
    const meta = signals.find((s) => s.channel === 'META')!;
    expect(meta.level).toBe('danger');
    expect(meta.reasons).toContain('3주 연속 감소 중');
    expect(meta.reasons).toContain('목표 달성률 40%');
  });

  it('목표 달성률 60% (단조 감소 없음) → warning', () => {
    const rows = [
      makeWeekRow('2026-08-10', { '구글 SEO': 10 }),
      makeWeekRow('2026-08-17', { '구글 SEO': 20 }),
      makeWeekRow('2026-08-24', { '구글 SEO': 15 }),
    ];
    const actual = zeroActual({ '구글 SEO': 6 });
    const signals = classifyChannelSignals(rows, 10, actual);
    const google = signals.find((s) => s.channel === '구글 SEO')!;
    expect(google.level).toBe('warning');
    expect(google.reasons).toContain('목표 달성률 60%');
  });

  it('정상 케이스 → good', () => {
    const rows = [
      makeWeekRow('2026-08-10', { 'B2B': 5 }),
      makeWeekRow('2026-08-17', { 'B2B': 10 }),
      makeWeekRow('2026-08-24', { 'B2B': 15 }),
    ];
    const actual = zeroActual({ 'B2B': 9 });
    const signals = classifyChannelSignals(rows, 10, actual);
    const b2b = signals.find((s) => s.channel === 'B2B')!;
    expect(b2b.level).toBe('good');
  });

  it('weeklyTarget null이면 reasons에 달성률 없음', () => {
    const rows = [
      makeWeekRow('2026-08-10', { '소개': 30 }),
      makeWeekRow('2026-08-17', { '소개': 20 }),
      makeWeekRow('2026-08-24', { '소개': 10 }),
    ];
    const actual = zeroActual({ '소개': 5 });
    const signals = classifyChannelSignals(rows, null, actual);
    const intro = signals.find((s) => s.channel === '소개')!;
    const hasAchievement = intro.reasons.some((r) => r.includes('목표 달성률'));
    expect(hasAchievement).toBe(false);
  });

  it('결과 정렬: danger → warning → good, 같은 레벨은 채널명 알파벳순', () => {
    const rows = [
      makeWeekRow('2026-08-10', { 'META': 30, '네이버 SEO': 30, 'B2B': 5 }),
      makeWeekRow('2026-08-17', { 'META': 20, '네이버 SEO': 20, 'B2B': 10 }),
      makeWeekRow('2026-08-24', { 'META': 10, '네이버 SEO': 10, 'B2B': 15 }),
    ];
    const actual = zeroActual({ 'META': 4, '네이버 SEO': 6, 'B2B': 9 });
    const signals = classifyChannelSignals(rows, 10, actual);
    const levels = signals.map((s) => s.level);
    const dangerIdx = levels.indexOf('danger');
    const warningIdx = levels.indexOf('warning');
    const goodIdx = levels.indexOf('good');
    if (dangerIdx !== -1 && warningIdx !== -1) expect(dangerIdx).toBeLessThan(warningIdx);
    if (warningIdx !== -1 && goodIdx !== -1) expect(warningIdx).toBeLessThan(goodIdx);
  });
});
