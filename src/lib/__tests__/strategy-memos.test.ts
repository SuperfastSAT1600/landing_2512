import { describe, it, expect, vi } from 'vitest';

// 순수 헬퍼만 테스트 — DB 의존(supabase-admin)은 모듈 로드 시 서버 전용 가드를 던지므로 스텁.
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));

import {
  pickCohort,
  serializeMemos,
  countLeads,
  distinctiveKeywords,
  parseThemes,
  buildSignalLines,
  leadTexts,
  type CohortRow,
  type RawTheme,
} from '@/lib/strategy-memos';
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

describe('countLeads (결정론적 키워드 카운트)', () => {
  const texts = ['진단 테스트 진행되지 않아 리마인드', '1500점대 나올지 걱정', '베테랑스와 고민', '일반 상담 메모'];

  it('키워드 포함 리드 수를 정확히 센다', () => {
    expect(countLeads(texts, ['리마인드'])).toBe(1);
    expect(countLeads(texts, ['1500점', '베테랑스'])).toBe(2); // OR 매칭, 리드당 1회
  });

  it('대소문자 무시(소문자 정규화 입력 가정)하고 빈 키워드는 무시한다', () => {
    expect(countLeads(['ManyChat 자동화'.toLowerCase()], ['manychat'])).toBe(1);
    expect(countLeads(texts, [])).toBe(0);
    expect(countLeads(texts, ['', '  '])).toBe(0);
  });

  it('한 리드가 여러 키워드를 가져도 1로만 센다', () => {
    expect(countLeads(['1500점 베테랑스 둘 다 언급'], ['1500점', '베테랑스'])).toBe(1);
  });
});

describe('parseThemes (라인 구분 파싱)', () => {
  it('라인 구분 형식에서 테마를 추출한다', () => {
    const t = parseThemes('진단 미진행 ||| 진단 예약 후 미진행 ||| 리마인드 메세지 전달 ||| 리마인드 ;; 미진행');
    expect(t).toHaveLength(1);
    expect(t[0]).toEqual({ label: '진단 미진행', summary: '진단 예약 후 미진행', quote: '리마인드 메세지 전달', keywords: ['리마인드', '미진행'] });
  });

  it('번호·불릿 머리말을 제거한다', () => {
    const t = parseThemes('- 라벨 ||| 요약 ||| 인용 ||| kw\n2. 라벨2 ||| 요약2 ||| 인용2 ||| kw2');
    expect(t.map((x) => x.label)).toEqual(['라벨', '라벨2']);
  });

  it('인용구에 따옴표·쉼표가 있어도 안전하다', () => {
    const t = parseThemes('경쟁사 ||| 대안 비교 ||| "베테랑스와 고민중", 1:1 과외도 ||| 베테랑스 ;; 과외');
    expect(t[0].quote).toBe('"베테랑스와 고민중", 1:1 과외도');
    expect(t[0].keywords).toEqual(['베테랑스', '과외']);
  });

  it('truncation으로 잘린 마지막 줄은 버리고 나머지는 살린다', () => {
    const t = parseThemes('완전 ||| 요약 ||| 인용 ||| kw\n잘린줄 ||| 요약만있고'); // 2번째는 필드 부족
    expect(t).toHaveLength(1);
    expect(t[0].label).toBe('완전');
  });

  it('구분자 없는 텍스트·빈 입력은 빈 배열', () => {
    expect(parseThemes('뚜렷한 반복 패턴 없음')).toEqual([]);
    expect(parseThemes('')).toEqual([]);
  });
});

describe('distinctiveKeywords (퍼널 보편어 제거)', () => {
  // 10개 리드 중 8개에 '진단 테스트'(보편어), 2개에 '리마인드'(변별력 있음)
  const texts = Array.from({ length: 10 }, (_, i) =>
    (i < 8 ? '진단 테스트 진행 ' : '') + (i < 2 ? '리마인드 ' : '') + '메모',
  );
  it('코호트 55% 초과로 매칭되는 키워드(보편어)는 버린다', () => {
    expect(distinctiveKeywords(texts, ['진단 테스트', '리마인드'])).toEqual(['리마인드']); // 진단 테스트=8/10 제거
  });
  it('보편어가 섞여도 변별력 있는 키워드만으로 카운트한다', () => {
    // '진단 테스트'(8) + '리마인드'(2) → 보편어 제거 후 리마인드만 → 2건
    expect(countLeads(texts, distinctiveKeywords(texts, ['진단 테스트', '리마인드']))).toBe(2);
  });
});

describe('buildSignalLines (하이브리드 — 코드 카운트로 재구성)', () => {
  const texts = [
    '진단 테스트 진행되지 않아 리마인드 메세지',
    '진단 미진행으로 다시 리마인드',
    '1500점대 나올지 걱정',
    '베테랑스와 고민중',
  ];
  const themes: RawTheme[] = [
    { label: '진단 미진행', summary: '진단 예약 후 미진행', quote: '리마인드 메세지 전달', keywords: ['리마인드', '미진행'] },
    { label: '점수 걱정', summary: '목표 미달 우려', quote: '1500점대 나올지 걱정', keywords: ['1500점'] }, // 1건 → 제외
  ];

  it('LLM 건수가 아닌 코드 카운트로 (n건)을 채운다', () => {
    const out = buildSignalLines(themes, texts);
    expect(out).toContain('[진단 미진행] 진단 예약 후 미진행 (2건):');
  });

  it('MIN_PATTERN_COUNT(2) 미만 테마는 제외한다', () => {
    const out = buildSignalLines(themes, texts);
    expect(out).not.toContain('점수 걱정'); // 1건이라 탈락
  });

  it('패턴이 모두 미달이면 빈 문자열', () => {
    const out = buildSignalLines([themes[1]], texts);
    expect(out).toBe('');
  });
});

describe('leadTexts', () => {
  it('리드별 전체 메모를 소문자·공백정규화 한 덩어리로 만든다', () => {
    const r = {
      ...({} as CohortRow),
      consultation_timeline: [
        { id: '1', created_at: new Date(NOW).toISOString(), raw_memo: 'First  Memo', published: false },
        { id: '2', created_at: new Date(NOW).toISOString(), raw_memo: 'Second Memo', published: false },
      ],
    } as CohortRow;
    const [text] = leadTexts([r]);
    expect(text).toBe('first memo second memo');
  });
});
