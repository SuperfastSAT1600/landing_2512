import { describe, expect, it } from 'vitest';
import type { Briefing } from '../classify';
import type { CoachRatio } from '../coach-ratio';
import { buildBriefingPayload } from '../briefing-payload';

const entry = { userId: 'u1', name: '가', remainingHours: 4, isNew: false, studyHallMinutes: 90, vocabMinutes: 30, lastDate: new Date('2026-10-22T10:00:00Z') };

describe('buildBriefingPayload', () => {
  it('세 목록과 코치 비율을 JSON으로 직렬화 가능한 형태로 담는다 (날짜는 ISO 문자열)', () => {
    const briefing: Briefing = { endingSoon: [entry], noSchedule: [{ ...entry, userId: 'u2', lastDate: null }], neverScheduled: [] };
    const coaches: CoachRatio[] = [{
      key: 'a', name: '코치', studentCount: 1, scheduledHours: 1, remainingHours: 4, ratio: 25, deltaPp: null,
      students: [{ userId: 'u1', name: '가', scheduledHours: 1, remainingHours: 4, ratio: 25 }],
    }];

    const payload = buildBriefingPayload(briefing, coaches, new Date('2026-10-21T23:00:00Z'));

    expect(payload.generatedAt).toBe('2026-10-21T23:00:00.000Z');
    expect(payload.endingSoon[0]).toMatchObject({ userId: 'u1', lastDate: '2026-10-22T10:00:00.000Z' });
    expect(payload.noSchedule[0].lastDate).toBeNull();
    expect(payload.coaches[0].students[0].userId).toBe('u1');
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
  });
});
