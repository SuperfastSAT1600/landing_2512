import { describe, it, expect } from 'vitest';
import {
  buildMirrorMemo,
  reactivationStrategyLabel,
  reactivationOutcomeFor,
  assignVariants,
} from '@/lib/winback/mirror';
import { applyJsFilters, buildPrefilter } from '@/lib/winback/prefilter';

describe('buildMirrorMemo / reactivationStrategyLabel', () => {
  it('상담 타임라인 미러 메모에 플레이·변형·문구가 담긴다', () => {
    const memo = buildMirrorMemo({
      playTitle: '5월 AP Calc 윈백',
      variantName: '가격 민감형',
      message: '어머님 안녕하세요, 지난 상담 이후...',
    });
    expect(memo).toContain('윈백 발송');
    expect(memo).toContain('5월 AP Calc 윈백');
    expect(memo).toContain('가격 민감형');
    expect(memo).toContain('어머님 안녕하세요');
  });

  it('문구가 없으면 발송 사실만 남긴다', () => {
    const memo = buildMirrorMemo({ playTitle: 'P', variantName: null, message: null });
    expect(memo).toContain('P');
    expect(memo.trim().endsWith('P')).toBe(true);
  });

  it('재활성화 로그 전략 라벨은 윈백임을 명시한다', () => {
    expect(reactivationStrategyLabel('P', '변형A')).toBe('[윈백] P / 변형A');
    expect(reactivationStrategyLabel('P', null)).toBe('[윈백] P');
  });
});

describe('reactivationOutcomeFor', () => {
  it('전환·재연결·긍정 반응은 reactivated', () => {
    expect(reactivationOutcomeFor({ converted_at: '2026-08-20T00:00:00Z' })).toBe('reactivated');
    expect(reactivationOutcomeFor({ reconnected_at: '2026-08-15T00:00:00Z' })).toBe('reactivated');
    expect(reactivationOutcomeFor({ response: 'positive' })).toBe('reactivated');
  });

  it('거절은 rejected, 무응답은 no_response', () => {
    expect(reactivationOutcomeFor({ response: 'negative' })).toBe('rejected');
    expect(reactivationOutcomeFor({ response: 'none' })).toBe('no_response');
  });

  it('보류(later)와 미마킹은 pending', () => {
    expect(reactivationOutcomeFor({ response: 'later' })).toBe('pending');
    expect(reactivationOutcomeFor({})).toBe('pending');
  });

  it('전환이 있으면 부정 반응보다 전환이 이긴다', () => {
    expect(
      reactivationOutcomeFor({ response: 'negative', converted_at: '2026-08-20T00:00:00Z' })
    ).toBe('reactivated');
  });
});

describe('assignVariants', () => {
  it('변형을 균등하게 라운드로빈 배정한다', () => {
    const map = assignVariants(['s1', 's2', 's3', 's4', 's5'], ['v1', 'v2']);
    expect([...map.values()]).toEqual(['v1', 'v2', 'v1', 'v2', 'v1']);
  });

  it('변형이 없으면 전부 null (변형 미지정 버킷)', () => {
    const map = assignVariants(['s1', 's2'], []);
    expect([...map.values()]).toEqual([null, null]);
  });

  it('학생이 없으면 빈 맵', () => {
    expect(assignVariants([], ['v1']).size).toBe(0);
  });

  it('startIndex를 주면 이어서 배정한다 — 리드를 나중에 더 담아도 균형이 유지된다', () => {
    const map = assignVariants(['s3', 's4'], ['v1', 'v2'], 1);
    expect([...map.values()]).toEqual(['v2', 'v1']);
  });
});

describe('buildPrefilter', () => {
  it('include_reactivating 기본값은 true — match_students와 같은 모집단', () => {
    expect(buildPrefilter({}).statuses).toEqual(['inactive', 'reactivating']);
    expect(buildPrefilter({ include_reactivating: false }).statuses).toEqual(['inactive']);
  });

  it('SQL로 걸 조건만 담고 빈 배열은 생략한다', () => {
    const plan = buildPrefilter({
      grades: ['10th', '11th'],
      campaign_tag_any: ['AP 문의'],
      churn_types: [],
    });
    expect(plan.grades).toEqual(['10th', '11th']);
    expect(plan.campaignTagAny).toEqual(['AP 문의']);
    expect(plan.churnTypes).toBeUndefined();
  });
});

describe('applyJsFilters', () => {
  const NOW = new Date('2026-08-11T00:00:00Z').getTime();
  const row = (over: Record<string, unknown> = {}) => ({
    id: 's1',
    name: '학생',
    updated_at: '2026-05-01T00:00:00Z',
    ...over,
  });

  it('이탈 경과일 상·하한을 적용한다', () => {
    const rows = [
      row({ id: 'recent', updated_at: '2026-08-09T00:00:00Z' }), // 2일
      row({ id: 'sweet', updated_at: '2026-06-01T00:00:00Z' }), // 71일
      row({ id: 'old', updated_at: '2024-01-01T00:00:00Z' }),
    ];
    const out = applyJsFilters(rows, { churned_after_days: 30, churned_within_days: 180 }, { now: NOW });
    expect(out.map((r) => r.id)).toEqual(['sweet']);
  });

  it('최근 컨택 제외 조건을 적용한다', () => {
    const rows = [
      row({ id: 'fresh', last_contacted_at: '2026-08-10T00:00:00Z' }),
      row({ id: 'stale', last_contacted_at: '2026-01-01T00:00:00Z' }),
      row({ id: 'never', last_contacted_at: null }),
    ];
    const out = applyJsFilters(rows, { exclude_recent_contact_days: 14 }, { now: NOW });
    expect(out.map((r) => r.id)).toEqual(['stale', 'never']);
  });

  it('이탈 단계 필터는 effectiveChurnStage 기준으로 본다', () => {
    const rows = [
      row({ id: 'deep', stage_history: [{ stage: '4' }, { stage: 'churned' }] }),
      row({ id: 'shallow', stage_history: [{ stage: '1' }, { stage: 'churned' }] }),
    ];
    const out = applyJsFilters(rows, { churn_stages: ['4'] }, { now: NOW });
    expect(out.map((r) => r.id)).toEqual(['deep']);
  });

  it('제외 id(쿨다운·기존 타겟)를 걸러낸다', () => {
    const rows = [row({ id: 'keep' }), row({ id: 'drop' })];
    const out = applyJsFilters(rows, {}, { now: NOW, excludeIds: new Set(['drop']) });
    expect(out.map((r) => r.id)).toEqual(['keep']);
  });

  it('churn_tag 접두 필터를 적용한다', () => {
    const rows = [
      row({ id: 'unpaid', churn_tag: '미결제: 수업료 부담' }),
      row({ id: 'refund', churn_tag: '환불: 종료' }),
    ];
    const out = applyJsFilters(rows, { churn_tag_prefixes: ['미결제'] }, { now: NOW });
    expect(out.map((r) => r.id)).toEqual(['unpaid']);
  });
});
