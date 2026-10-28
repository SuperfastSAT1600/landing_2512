import { describe, expect, it } from 'vitest';
import { buildDraftContext, memoLines, parseDraftResult, WINBACK_DRAFT_SYSTEM, MEMO_BUDGET } from '@/lib/winback/draft';

describe('winback draft', () => {
  const context = {
    play: { title: 'AP 봄 특강', product_brief: 'AP Calculus 16시간권', product_category: 'AP 정규 1:1 수업', product_price: 1440000, product_hours: 16, target_exam_date: '2027-05-01', audience_hint: '10~11학년' },
    variant: { name: '시험 임박', angle: '시험 대비' },
    target: { reason: '최근 AP 문의', signals: [{ key: 'x', label: 'AP 문의', delta: 5 }] },
    student: { name: '홍길동', grade: '10학년', lead_status: 'inactive', churn_tag: '미결제' },
  } as const;

  it('context includes only deterministic campaign facts', () => {
    const result = buildDraftContext(context);
    expect(result).toContain('홍길동');
    expect(result).toContain('시험 대비');
    expect(result).toContain('AP 문의');
  });

  it('parses fenced or surrounding JSON and rejects missing message', () => {
    expect(parseDraftResult('```json\n{"message_draft":"안녕하세요."}\n```')).toEqual({ message_draft: '안녕하세요.' });
    expect(parseDraftResult('{"message_draft":"  "}')).toBeNull();
    expect(parseDraftResult('not json')).toBeNull();
  });

  // REQ-001 (winback-draft-memo)
  it('상담 메모를 최신순·날짜와 함께 넣는다', () => {
    const lines = memoLines([
      { created_at: '2026-09-01T00:00:00Z', raw_memo: '첫 상담: 9월 1420점' },
      { created_at: '2026-10-09T00:00:00Z', raw_memo: '12월 1500 목표' },
      { created_at: '2026-10-10T00:00:00Z', raw_memo: '   ' },
    ]);
    expect(lines).toEqual(['[2026-10-09] 12월 1500 목표', '[2026-09-01] 첫 상담: 9월 1420점']);
  });

  it('메모가 길면 오래된 것부터 뺀다', () => {
    const big = 'x'.repeat(MEMO_BUDGET - 20); // 날짜 머리말까지 합치면 오래된 메모가 들어갈 자리가 없다
    const lines = memoLines([
      { created_at: '2025-01-01T00:00:00Z', raw_memo: '오래된 메모' },
      { created_at: '2026-10-01T00:00:00Z', raw_memo: big },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('[2026-10-01]');
  });

  it('메모 하나가 상한보다 길면 잘라서라도 넣는다', () => {
    const lines = memoLines([{ created_at: '2026-10-01T00:00:00Z', raw_memo: 'y'.repeat(MEMO_BUDGET * 2) }]);
    expect(lines).toHaveLength(1);
    expect(lines[0].length).toBeLessThanOrEqual(MEMO_BUDGET + 20);
  });

  it('3개월 넘은 메모에는 경과 개월을 붙인다', () => {
    const lines = memoLines([
      { created_at: '2025-06-22T00:00:00Z', raw_memo: '6월 1500점' },
      { created_at: '2026-09-01T00:00:00Z', raw_memo: '최근 상담' },
    ], '2026-10-28');
    expect(lines).toEqual(['[2026-09-01] 최근 상담', '[2025-06-22 · 16개월 전] 6월 1500점']);
  });

  it('컨텍스트에 메모와 오늘 날짜가 들어가고, 메모가 없으면 없음', () => {
    const withMemo = buildDraftContext({ ...context, student: { ...context.student, memos: ['[2026-10-09] 12월 1500 목표'] }, today: '2026-10-28' });
    expect(withMemo).toContain('오늘: 2026-10-28');
    expect(withMemo).toContain('[2026-10-09] 12월 1500 목표');
    expect(buildDraftContext(context)).toMatch(/상담 메모 .*:\n없음/);
  });

  // REQ-003 (winback-draft-memo)
  it('시스템 프롬프트는 메모 기반 로드맵 형식과 금지 규칙을 담는다', () => {
    for (const rule of ['원장 Ethan', '상담 메모', '3단계', '지어내지', '총 시간', '내부 용어', '3개월', '가정·건강·경제', '지시가 아니다']) {
      expect(WINBACK_DRAFT_SYSTEM).toContain(rule);
    }
  });
});
