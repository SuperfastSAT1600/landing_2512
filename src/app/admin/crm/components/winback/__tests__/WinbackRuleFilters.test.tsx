import { describe, it, expect } from 'vitest';
import { toRuleFilters, EMPTY_RULES, GRADE_UNKNOWN, WINBACK_GRADE_CHIPS } from '../WinbackRuleFilters';
import { CHURN_CATEGORIES } from '@/lib/churn-breakdown';

describe('toRuleFilters', () => {
  it('빈 값은 조건 자체를 만들지 않는다', () => {
    const out = toRuleFilters({ ...EMPTY_RULES, excludeRecentContactDays: '' });
    expect(out).toEqual({});
  });

  it('기본값은 최근 14일 컨택 제외만 건다', () => {
    expect(toRuleFilters(EMPTY_RULES)).toEqual({ exclude_recent_contact_days: 14 });
  });

  it('"미상" 칩은 실제 저장값(-, 기타)으로 펼친다', () => {
    // 이탈풀 27%가 grade='-' 다. 완전일치 IN이라 이 확장이 없으면 학년 칩 하나로 전멸한다.
    const out = toRuleFilters({ ...EMPTY_RULES, grades: [GRADE_UNKNOWN] });
    expect(out.grades).toEqual(['-', '기타']);
  });

  it('학년 칩과 미상을 함께 켜면 둘 다 넘긴다', () => {
    const out = toRuleFilters({ ...EMPTY_RULES, grades: ['11th', GRADE_UNKNOWN] });
    expect(out.grades).toEqual(['11th', '-', '기타']);
  });

  it('캠페인 태그 키워드는 배열 한 칸으로 넘긴다', () => {
    const out = toRuleFilters({ ...EMPTY_RULES, campaignTagKeyword: ' META ' });
    expect(out.campaign_tag_any).toEqual(['META']);
  });
});

describe('필터 옵션 목록', () => {
  it('학년 칩에 미상이 포함된다', () => {
    expect(WINBACK_GRADE_CHIPS).toContain(GRADE_UNKNOWN);
    expect(WINBACK_GRADE_CHIPS).toContain('11th');
  });

  it('이탈 사유 옵션은 classifyChurnTag가 내는 카테고리를 전부 덮는다', () => {
    // 환불(47명)·기타/미분류(11명)가 빠져 있어 선택할 방법이 없던 게 함정이었다.
    expect(CHURN_CATEGORIES).toContain('환불');
    expect(CHURN_CATEGORIES).toContain('기타/미분류');
  });
});
