import { describe, it, expect, vi } from 'vitest';

// 순수 헬퍼만 테스트 — DB 의존(supabase-admin)은 모듈 로드 시 서버 전용 가드를 던지므로 스텁.
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));

import { pickCohort, serializeMemos, type CohortRow } from '@/lib/strategy-memos';
import type { ConsultationEntry } from '@/types/crm';

const NOW = new Date('2026-06-21T00:00:00Z').getTime();
const DAY = 86400000;

function memo(text: string, daysAgo = 1): ConsultationEntry {
  return {
    id: `m-${text}-${daysAgo}`,
    created_at: new Date(NOW - daysAgo * DAY).toISOString(),
    raw_memo: text,
    published: false,
  };
}

function row(over: Partial<CohortRow>): CohortRow {
  return {
    id: Math.random().toString(36).slice(2),
    name: '홍길동',
    funnel_stage: '2', // SLA 3일
    funnel_stage_updated_at: new Date(NOW - 10 * DAY).toISOString(), // 10일 정체 → SLA 초과
    created_at: new Date(NOW - 20 * DAY).toISOString(),
    lead_status: 'active',
    consultation_timeline: [memo('가격이 부담된다')],
    ...over,
  };
}

describe('pickCohort', () => {
  it('SLA를 초과한 정체 active 리드만 포함한다', () => {
    const stalled = row({ id: 'stalled', funnel_stage_updated_at: new Date(NOW - 10 * DAY).toISOString() });
    const fresh = row({ id: 'fresh', funnel_stage_updated_at: new Date(NOW - 1 * DAY).toISOString() }); // 1일 < SLA 3일
    const cohort = pickCohort([stalled, fresh], [], NOW);
    expect(cohort.map((r) => r.id)).toEqual(['stalled']);
  });

  it('이탈 리드를 정체 리드 뒤에 보충하고 id 중복을 제거한다', () => {
    const stalled = row({ id: 'A' });
    const churned = row({ id: 'B', lead_status: 'inactive' });
    const dupe = row({ id: 'A', lead_status: 'inactive' }); // active로 이미 포함 → 중복 제거
    const cohort = pickCohort([stalled], [churned, dupe], NOW);
    expect(cohort.map((r) => r.id)).toEqual(['A', 'B']);
  });

  it('메모가 없는 리드는 제외한다', () => {
    const withMemo = row({ id: 'has', consultation_timeline: [memo('이슈')] });
    const noMemo = row({ id: 'none', consultation_timeline: [] });
    const cohort = pickCohort([withMemo, noMemo], [], NOW);
    expect(cohort.map((r) => r.id)).toEqual(['has']);
  });

  it('MAX_LEADS(40) 상한을 적용한다', () => {
    const many = Array.from({ length: 60 }, (_, i) => row({ id: `s${i}` }));
    const cohort = pickCohort(many, [], NOW);
    expect(cohort).toHaveLength(40);
  });
});

describe('serializeMemos', () => {
  it('상태·단계 라벨과 메모를 압축해 직렬화한다', () => {
    const out = serializeMemos([
      row({ lead_status: 'active', funnel_stage: '2', consultation_timeline: [memo('가격 이의')] }),
      row({ lead_status: 'inactive', funnel_stage: 'churned', consultation_timeline: [memo('경쟁사로 감')] }),
    ]);
    expect(out).toContain('[정체·');
    expect(out).toContain('[이탈·');
    expect(out).toContain('가격 이의');
    expect(out).toContain('경쟁사로 감');
  });

  it('ai_purified가 있으면 raw_memo보다 우선한다', () => {
    const entry: ConsultationEntry = { ...memo('원본'), ai_purified: '가공본' };
    const out = serializeMemos([row({ consultation_timeline: [entry] })]);
    expect(out).toContain('가공본');
    expect(out).not.toContain('원본');
  });

  it('리드당 최신 4건까지만 직렬화한다', () => {
    const entries = Array.from({ length: 6 }, (_, i) => memo(`메모${i}`, i + 1));
    const out = serializeMemos([row({ consultation_timeline: entries })]);
    // 최신순(daysAgo 작은 것) 4건: 메모0~메모3 포함, 메모4·메모5 제외
    expect(out).toContain('메모0');
    expect(out).toContain('메모3');
    expect(out).not.toContain('메모4');
    expect(out).not.toContain('메모5');
  });
});
