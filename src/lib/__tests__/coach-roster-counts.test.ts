import { describe, it, expect } from 'vitest';
import { studentCountsBySlug } from '../coach-roster-counts';
import type { CoachRoster, RosterCoach } from '../coach-roster';

const coach = (over: Partial<RosterCoach>): RosterCoach => ({
  key: 'k', slug: 'kim', name: '김', linked: true, registered: true,
  activeCount: 0, onboardingCount: 0, pausedCount: 0, students: [], ...over,
});
const roster = (coaches: RosterCoach[]): CoachRoster => ({ coaches, unassigned: [] });

describe('studentCountsBySlug', () => {
  // REQ-001
  it('slug별 재원·온보딩 수를 돌려주고 휴원은 세지 않는다', () => {
    const map = studentCountsBySlug(roster([
      coach({ slug: 'kim', activeCount: 5, onboardingCount: 2, pausedCount: 3 }),
      coach({ key: 'k2', slug: 'lee', activeCount: 0, onboardingCount: 0 }),
    ]));
    expect(map.get('kim')).toEqual({ active: 5, onboarding: 2 });
    expect(map.get('lee')).toEqual({ active: 0, onboarding: 0 });
  });

  it('CRM에 등록되지 않은 코치(slug 없음)는 제외한다', () => {
    const map = studentCountsBySlug(roster([coach({ key: 'v2:x', slug: null, registered: false, activeCount: 4 })]));
    expect(map.size).toBe(0);
  });
});
