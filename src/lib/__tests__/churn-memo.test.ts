import { describe, it, expect } from 'vitest';
import { buildChurnMemo } from '@/lib/churn-memo';

describe('buildChurnMemo', () => {
  it('잠재 복귀 가능 이탈을 태그·사유와 함께 적는다', () => {
    expect(
      buildChurnMemo({ churnTag: '회신 없음', reason: '콜 당일 무응답', churnType: 'potential' })
    ).toBe('이탈 처리 · 잠재 복귀 가능\n이탈 태그: 회신 없음\n사유: 콜 당일 무응답');
  });

  it('완전 종료는 분류 라벨이 다르다', () => {
    expect(
      buildChurnMemo({ churnTag: '미결제', reason: '타 학원 등록 결정', churnType: 'closed' })
    ).toBe('이탈 처리 · 완전 종료\n이탈 태그: 미결제\n사유: 타 학원 등록 결정');
  });

  it('사유 앞뒤 공백을 정리한다', () => {
    expect(
      buildChurnMemo({ churnTag: '노쇼', reason: '  두 번 노쇼  ', churnType: 'potential' })
    ).toBe('이탈 처리 · 잠재 복귀 가능\n이탈 태그: 노쇼\n사유: 두 번 노쇼');
  });

  it('사유가 비면 사유 줄을 생략한다', () => {
    expect(buildChurnMemo({ churnTag: '기타', reason: '   ', churnType: 'closed' })).toBe(
      '이탈 처리 · 완전 종료\n이탈 태그: 기타'
    );
  });
});
