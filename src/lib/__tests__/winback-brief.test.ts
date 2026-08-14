import { describe, it, expect } from 'vitest';
import { parseBrief, buildBriefQueryText } from '@/lib/winback/brief';

describe('parseBrief', () => {
  it('자유 텍스트에서 과목군·과목·학년·시험월·가격·시간을 뽑는다', () => {
    const p = parseBrief({
      brief: 'AP Calculus BC 16시간권, 8~11학년 대상, 5월 시험 대비, 144만원',
    });

    expect(p.subjectKind).toBe('AP');
    expect(p.subjectTokens).toContain('calculus');
    expect(p.grades).toEqual([8, 9, 10, 11]);
    expect(p.examMonth).toBe(5);
    expect(p.price).toBe(1440000);
    expect(p.hours).toBe(16);
  });

  it('SAT 브리프는 SAT로 판정한다', () => {
    const p = parseBrief({ brief: 'SAT 1:1 10시간권, 165,000원/시간, 11학년 위주' });
    expect(p.subjectKind).toBe('SAT');
    expect(p.grades).toEqual([11]);
    expect(p.hours).toBe(10);
  });

  it('과목군을 못 찾으면 기타', () => {
    expect(parseBrief({ brief: '여름 특강 상담 재개' }).subjectKind).toBe('기타');
  });

  it('하이픈·물결·"부터" 학년 범위를 모두 인식한다', () => {
    expect(parseBrief({ brief: '9-11학년' }).grades).toEqual([9, 10, 11]);
    expect(parseBrief({ brief: '9~10학년' }).grades).toEqual([9, 10]);
    expect(parseBrief({ brief: '10학년, 11학년' }).grades).toEqual([10, 11]);
  });

  it('구조화 필드가 자유 텍스트보다 우선한다', () => {
    const p = parseBrief({
      brief: 'SAT 얘기지만 실제로는 AP 상품',
      product_category: 'AP 정규 1:1 수업',
      target_exam_date: '2027-05-10',
      product_price: 1440000,
      product_hours: 16,
    });
    expect(p.subjectKind).toBe('AP');
    expect(p.examMonth).toBe(5);
    expect(p.price).toBe(1440000);
    expect(p.hours).toBe(16);
  });

  it('만원·원 표기를 모두 금액으로 정규화한다', () => {
    expect(parseBrief({ brief: '272만원 패키지' }).price).toBe(2720000);
    expect(parseBrief({ brief: '1,650,000원' }).price).toBe(1650000);
  });

  it('없는 정보는 null/빈 배열로 남긴다 — 추측하지 않는다', () => {
    const p = parseBrief({ brief: 'AP 수업권' });
    expect(p.grades).toEqual([]);
    expect(p.examMonth).toBeNull();
    expect(p.price).toBeNull();
  });
});

describe('buildBriefQueryText', () => {
  it('임베딩 쿼리에 브리프와 파생 신호를 함께 담는다', () => {
    const brief = 'AP Calculus BC 16시간권, 8~11학년, 5월 시험 대비';
    const text = buildBriefQueryText(brief, parseBrief({ brief }));

    expect(text).toContain(brief);
    expect(text).toContain('AP');
    expect(text).toContain('8, 9, 10, 11');
  });

  it('같은 입력이면 같은 문자열 — 임베딩 캐시/재현성 확보', () => {
    const brief = 'SAT 1:1 10시간권';
    const a = buildBriefQueryText(brief, parseBrief({ brief }));
    const b = buildBriefQueryText(brief, parseBrief({ brief }));
    expect(a).toBe(b);
  });
});
