import { describe, it, expect } from 'vitest';
import { buildRenewalOutcomeMemo, RENEWAL_OUTCOME_MEMO_HEADER } from '../renewal/mirror';

describe('buildRenewalOutcomeMemo', () => {
  it('같은 값이라도 단계에 따라 다르게 읽힌다', () => {
    expect(buildRenewalOutcomeMemo({ stage: '4', quality: 'good', reasonTag: '성적 향상' })).toBe(
      `${RENEWAL_OUTCOME_MEMO_HEADER} · 좋은 재결제\n사유: 성적 향상`
    );
    expect(
      buildRenewalOutcomeMemo({ stage: '5', quality: 'good', reasonTag: '목표 점수 달성' })
    ).toBe(`${RENEWAL_OUTCOME_MEMO_HEADER} · 좋은 이탈\n사유: 목표 점수 달성`);
  });

  it('메모가 있으면 빈 줄을 두고 덧붙인다', () => {
    expect(
      buildRenewalOutcomeMemo({
        stage: '4',
        quality: 'bad',
        reasonTag: '할인·조건 요구',
        reasonNote: '20% 깎아달라고 함',
      })
    ).toBe(`${RENEWAL_OUTCOME_MEMO_HEADER} · 나쁜 재결제\n사유: 할인·조건 요구\n\n20% 깎아달라고 함`);
  });

  it('공백뿐인 메모는 없는 것으로 본다', () => {
    const memo = buildRenewalOutcomeMemo({
      stage: '5',
      quality: 'bad',
      reasonTag: '응답 없음',
      reasonNote: '   ',
    });
    expect(memo.endsWith('사유: 응답 없음')).toBe(true);
  });
});
