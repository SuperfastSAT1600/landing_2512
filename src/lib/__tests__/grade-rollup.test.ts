/**
 * 2026-09 학년도 롤오버 일괄 승급 로직.
 * 케이스는 실측 분포(students 1,492행, 2026-09-18)에 실재하는 26개 표기를 전부 덮는다.
 */
import { describe, it, expect } from 'vitest';
import { bumpFor, rollupGrade, SCOPE_CUTOFF } from '@/lib/grade-rollup';

const KR = '한국 학제';
const IB = 'IB';

/** IB +1 구간(2025-08 이후)의 대표 날짜. */
const IB_P1 = '2025-09-02T00:00:00';

describe('bumpFor — 학제별 학년 경계', () => {
  it('한국 학제는 3월을 경계로 삼는다', () => {
    expect(bumpFor('2026-03-01T00:00:00', KR)).toBe(0);
    expect(bumpFor('2026-02-28T23:59:59', KR)).toBe(1);
    expect(bumpFor('2025-03-01T00:00:00', KR)).toBe(1);
    expect(bumpFor('2025-02-28T00:00:00', KR)).toBe(2);
  });

  it('IB·AP·국제학교는 8월을 경계로 삼는다', () => {
    expect(bumpFor('2025-08-01T00:00:00', IB)).toBe(1);
    expect(bumpFor('2025-07-31T00:00:00', IB)).toBe(2);
    expect(bumpFor('2025-08-01T00:00:00', 'AP')).toBe(1);
    expect(bumpFor('2025-08-01T00:00:00', '국제학교')).toBe(1);
  });

  it('school_type이 비어 있으면 8월 기준으로 본다', () => {
    expect(bumpFor(IB_P1, null)).toBe(1);
  });

  it('대상 범위(2026-08-01) 밖은 0이다', () => {
    expect(bumpFor(SCOPE_CUTOFF, KR)).toBe(0);
    expect(bumpFor('2026-09-17T07:38:16', IB)).toBe(0);
  });
});

describe('rollupGrade — 표기 형식 보존', () => {
  const cases: Array<[string, number, string]> = [
    ['5th', 1, '6th'], ['6th', 1, '7th'], ['7th', 1, '8th'], ['8th', 1, '9th'],
    ['9th', 1, '10th'], ['10th', 1, '11th'], ['11th', 1, '12th'],
    ['10th', 2, '12th'], ['9th', 2, '11th'],
    ['Y8', 1, 'Y9'], ['Y10', 1, 'Y11'], ['Y11', 1, 'Y12'],
    ['US10', 1, 'US11'], ['US08', 1, 'US09'],
    ['고1', 1, '고2'], ['고2', 1, '고3'],
    ['중1', 1, '중2'], ['중3', 1, '고1'], ['중3', 2, '고2'],
  ];

  for (const [before, bump, after] of cases) {
    it(`${before} +${bump} → ${after}`, () => {
      const date = bump === 1 ? '2025-09-02T00:00:00' : '2025-02-01T00:00:00';
      const r = rollupGrade(before, date, KR);
      expect(r.bump).toBe(bump);
      expect(r.after).toBe(after);
      expect(r.reason).toBe('bumped');
    });
  }

  it('리드 임포트가 남긴 [1] 접두는 제거한다', () => {
    expect(rollupGrade('[1] US10', IB_P1, IB).after).toBe('US11');
    expect(rollupGrade('[1] US11', IB_P1, IB).after).toBe('US12');
  });
});

describe('rollupGrade — 12학년 초과는 졸업', () => {
  it.each(['12th', 'Y12', 'US12', '고3', '[1] US12'])('%s +1 → 졸업', (g) => {
    const r = rollupGrade(g, IB_P1, IB);
    expect(r.after).toBe('졸업');
    expect(r.reason).toBe('graduated_out');
  });

  it('Y13(IB 최종 학년)도 졸업으로 간다', () => {
    expect(rollupGrade('Y13', IB_P1, IB).after).toBe('졸업');
  });

  it('11th +2도 졸업이다', () => {
    expect(rollupGrade('11th', '2025-02-01T00:00:00', KR).after).toBe('졸업');
  });
});

describe('rollupGrade — 변경하지 않는 경우', () => {
  it.each(['-', '–', '기타', '미확인', '', '   '])('파싱 불가 %s', (g) => {
    const r = rollupGrade(g, IB_P1, IB);
    expect(r.after).toBeNull();
    expect(r.reason).toBe('unparsable');
  });

  it('NULL 학년', () => {
    expect(rollupGrade(null, IB_P1, IB).reason).toBe('unparsable');
  });

  it.each(['졸업', '재수', '성인'])('이미 학적 밖인 %s', (g) => {
    const r = rollupGrade(g, IB_P1, IB);
    expect(r.after).toBeNull();
    expect(r.reason).toBe('already_graduated');
  });

  it('승급 폭이 0이면 학년이 13 이상이어도 건드리지 않는다', () => {
    const r = rollupGrade('Y13', '2026-05-01T00:00:00', KR);
    expect(r.after).toBeNull();
    expect(r.reason).toBe('no_bump');
  });

  it('2026-08-01 이후 인입은 대상이 아니다', () => {
    const r = rollupGrade('11th', '2026-09-01T00:00:00', IB);
    expect(r.after).toBeNull();
    expect(r.reason).toBe('out_of_scope');
  });

  it('승급 결과가 원래 값과 같으면 null을 돌려준다', () => {
    // 한국 학제 2026-03 이후 = 0단계. no_bump와 같은 경로지만 after가 반드시 null이어야 한다.
    expect(rollupGrade('10th', '2026-06-01T00:00:00', KR).after).toBeNull();
  });
});
