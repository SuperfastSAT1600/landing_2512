import { describe, expect, it } from 'vitest';
import { buildDraftContext, parseDraftResult } from '@/lib/winback/draft';

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
});
