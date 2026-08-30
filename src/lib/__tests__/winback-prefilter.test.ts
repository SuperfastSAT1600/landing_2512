import { describe, it, expect } from 'vitest';
import { applyJsFilters, buildPrefilter, type JsFilterRow } from '@/lib/winback/prefilter';
import { churnedDaysOf } from '@/lib/winback/recency';

const NOW = new Date('2026-08-19T00:00:00Z').getTime();

/**
 * updated_at은 2026-08-11 일괄 백필로 오염돼 있다(이탈풀 1,261명 중 1,224명이 같은 시각).
 * 그래서 이탈 경과일은 inactive_at을 먼저 본다.
 */
function row(over: Partial<JsFilterRow> = {}): JsFilterRow {
  return {
    id: 's1',
    updated_at: '2026-08-11T08:22:32Z', // 일괄 백필 시각 = 경과 8일로 보이는 가짜 값
    ...over,
  };
}

describe('churnedDaysOf', () => {
  it('inactive_at이 있으면 그 값으로 경과일을 계산한다', () => {
    expect(Math.round(churnedDaysOf(row({ inactive_at: '2026-05-01T00:00:00Z' }), NOW))).toBe(110);
  });

  it('inactive_at이 없으면 updated_at으로 폴백한다 (컬럼 적용 전에도 동작)', () => {
    expect(Math.round(churnedDaysOf(row(), NOW))).toBe(8);
  });
});

describe('applyJsFilters — 이탈 경과일', () => {
  const rules = { churned_after_days: 30 };

  it('inactive_at 기준으로 최소 경과일을 판정한다', () => {
    const old = row({ id: 'old', inactive_at: '2026-05-01T00:00:00Z' });
    const fresh = row({ id: 'fresh', inactive_at: '2026-08-15T00:00:00Z' });

    const kept = applyJsFilters([old, fresh], rules, { now: NOW });
    expect(kept.map((r) => r.id)).toEqual(['old']);
  });

  it('일괄 백필된 updated_at만 있으면 최소 경과일 조건에서 전멸한다 (수정 전 함정 재현)', () => {
    expect(applyJsFilters([row()], rules, { now: NOW })).toHaveLength(0);
  });

  it('최대 경과일도 inactive_at 기준이다', () => {
    const kept = applyJsFilters(
      [
        row({ id: 'stale', inactive_at: '2024-01-01T00:00:00Z' }),
        row({ id: 'recent', inactive_at: '2026-07-01T00:00:00Z' }),
      ],
      { churned_within_days: 180 },
      { now: NOW }
    );
    expect(kept.map((r) => r.id)).toEqual(['recent']);
  });
});

describe('applyJsFilters — 기타 조건', () => {
  it('excludeIds에 담긴 후보는 제외한다 (쿨다운·중복 타겟)', () => {
    const kept = applyJsFilters([row({ id: 'a' }), row({ id: 'b' })], {}, {
      now: NOW,
      excludeIds: new Set(['a']),
    });
    expect(kept.map((r) => r.id)).toEqual(['b']);
  });

  it('최근 컨택 제외일 안에 컨택한 후보는 뺀다', () => {
    const kept = applyJsFilters(
      [
        row({ id: 'contacted', last_contacted_at: '2026-08-15T00:00:00Z' }),
        row({ id: 'quiet', last_contacted_at: '2026-06-01T00:00:00Z' }),
      ],
      { exclude_recent_contact_days: 14 },
      { now: NOW }
    );
    expect(kept.map((r) => r.id)).toEqual(['quiet']);
  });

  it('컨택 이력이 없는 후보는 최근 컨택 제외 조건에 걸리지 않는다', () => {
    const kept = applyJsFilters([row({ id: 'never', last_contacted_at: null })], {
      exclude_recent_contact_days: 14,
    }, { now: NOW });
    expect(kept.map((r) => r.id)).toEqual(['never']);
  });

  it('이탈 단계 필터는 effectiveChurnStage 기준으로 본다', () => {
    const kept = applyJsFilters(
      [
        row({ id: 'deep', stage_history: [{ stage: '4' }, { stage: 'churned' }] }),
        row({ id: 'shallow', stage_history: [{ stage: '1' }, { stage: 'churned' }] }),
      ],
      { churn_stages: ['4'] },
      { now: NOW }
    );
    expect(kept.map((r) => r.id)).toEqual(['deep']);
  });

  it('이탈 경과일 상·하한을 동시에 적용한다', () => {
    const kept = applyJsFilters(
      [
        row({ id: 'recent', inactive_at: '2026-08-17T00:00:00Z' }),
        row({ id: 'sweet', inactive_at: '2026-06-01T00:00:00Z' }),
        row({ id: 'old', inactive_at: '2024-01-01T00:00:00Z' }),
      ],
      { churned_after_days: 30, churned_within_days: 180 },
      { now: NOW }
    );
    expect(kept.map((r) => r.id)).toEqual(['sweet']);
  });

  it('이탈 사유 카테고리 필터는 태그가 없는 후보를 뺀다', () => {
    const kept = applyJsFilters(
      [
        row({ id: 'tagged', churn_tag: '미결제: 수업료 부담' }),
        row({ id: 'untagged', churn_tag: null }),
      ],
      { churn_tag_prefixes: ['미결제'] },
      { now: NOW }
    );
    expect(kept.map((r) => r.id)).toEqual(['tagged']);
  });

  it('캠페인 태그는 부분 일치·대소문자 무시로 잡는다 (SQL 완전일치 함정 제거)', () => {
    const kept = applyJsFilters(
      [
        row({ id: 'meta', campaign_tags: ['META 리드'] }),
        row({ id: 'landing', campaign_tags: ['랜딩페이지'] }),
        row({ id: 'none', campaign_tags: [] }),
      ],
      { campaign_tag_any: ['meta'] },
      { now: NOW }
    );
    expect(kept.map((r) => r.id)).toEqual(['meta']);
  });

  it('접두가 없는 자유문 태그는 기타/미분류로 잡힌다', () => {
    const kept = applyJsFilters(
      [row({ id: 'free', churn_tag: '상담 희망하지 않음' })],
      { churn_tag_prefixes: ['기타/미분류'] },
      { now: NOW }
    );
    expect(kept.map((r) => r.id)).toEqual(['free']);
  });
});

describe('buildPrefilter', () => {
  it('빈 배열은 조건 자체를 만들지 않는다 (전체 허용)', () => {
    const plan = buildPrefilter({ grades: [], school_types: ['AP'] });
    expect(plan.grades).toBeUndefined();
    expect(plan.schoolTypes).toEqual(['AP']);
  });

  it('campaign_tag_any는 SQL 계획에 담지 않는다 (부분일치라 JS에서 처리)', () => {
    expect(buildPrefilter({ campaign_tag_any: ['META'] })).not.toHaveProperty('campaignTagAny');
  });

  it('reactivating은 기본 포함, 명시적으로 끌 수 있다', () => {
    expect(buildPrefilter({}).statuses).toEqual(['inactive', 'reactivating']);
    expect(buildPrefilter({ include_reactivating: false }).statuses).toEqual(['inactive']);
  });
});
