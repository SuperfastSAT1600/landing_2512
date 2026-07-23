import { describe, it, expect } from 'vitest';
import { aggregateChurn, formatChurnLines, type ChurnRow } from '../churn-breakdown';

const row = (churn_tag: string | null, churn_type: ChurnRow['churn_type'] = null): ChurnRow => ({
  churn_tag,
  churn_type,
});

describe('aggregateChurn — 접두 카테고리 파싱', () => {
  it('"{카테고리}: {사유}" 형식을 접두 카테고리로 집계하고 자유서술을 sample로 담는다', () => {
    const b = aggregateChurn([
      row('미결제: 콜 당일 무응답'),
      row('미결제: 학년이 어려 시작 보류'),
      row('환불: AP 종료 후 잔여시간 환불'),
      row('회신 없음: 카톡·전화 모두 무응답'),
    ]);
    const byCat = Object.fromEntries(b.categories.map((c) => [c.category, c.count]));
    expect(byCat['미결제']).toBe(2);
    expect(byCat['환불']).toBe(1);
    expect(byCat['회신 없음']).toBe(1);
    const 미결제 = b.categories.find((c) => c.category === '미결제')!;
    expect(미결제.samples).toContain('콜 당일 무응답');
    expect(미결제.samples).toContain('학년이 어려 시작 보류');
  });

  it('콜론 없는 카테고리 단독 태그는 detail 없이 카테고리만 집계', () => {
    const b = aggregateChurn([row('노쇼'), row('회신 없음')]);
    expect(b.categories.find((c) => c.category === '노쇼')!.count).toBe(1);
    expect(b.categories.find((c) => c.category === '노쇼')!.samples).toEqual([]);
  });

  it('알려진 접두가 없는 자유문은 기타/미분류로 묶고 원문을 sample로 담는다', () => {
    const b = aggregateChurn([row('상담 희망하지 않음'), row('학생이 독학 희망하여 이탈')]);
    const unc = b.categories.find((c) => c.category === '기타/미분류')!;
    expect(unc.count).toBe(2);
    expect(unc.samples).toContain('상담 희망하지 않음');
  });

  it('null·빈 태그는 total엔 포함하되 taggedTotal·카테고리에서 제외', () => {
    const b = aggregateChurn([row(null), row('   '), row('미결제: x')]);
    expect(b.total).toBe(3);
    expect(b.taggedTotal).toBe(1);
    expect(b.categories.reduce((s, c) => s + c.count, 0)).toBe(1);
  });

  it('churn_type을 potential/closed로 집계', () => {
    const b = aggregateChurn([row('미결제: a', 'potential'), row('환불: b', 'closed'), row(null, 'closed')]);
    expect(b.potential).toBe(1);
    expect(b.closed).toBe(2);
  });

  it('카테고리는 count 내림차순', () => {
    const b = aggregateChurn([
      row('환불: a'),
      row('미결제: b'),
      row('미결제: c'),
      row('미결제: d'),
      row('회신 없음: e'),
      row('회신 없음: f'),
    ]);
    expect(b.categories.map((c) => c.category)).toEqual(['미결제', '회신 없음', '환불']);
  });

  it('자유서술의 개행·중복 공백을 한 줄로 정규화하고 길이를 상한한다', () => {
    const long = 'a'.repeat(200);
    const b = aggregateChurn([
      row('환불: 6월 종료 후 환불\n코치 불만족\n12시간 환불'),
      row(`미결제: ${long}`),
    ]);
    const 환불 = b.categories.find((c) => c.category === '환불')!;
    expect(환불.samples[0]).not.toContain('\n');
    expect(환불.samples[0]).toBe('6월 종료 후 환불 코치 불만족 12시간 환불');
    const 미결제 = b.categories.find((c) => c.category === '미결제')!;
    expect(미결제.samples[0].length).toBeLessThanOrEqual(80);
    expect(미결제.samples[0].endsWith('…')).toBe(true);
  });

  it('sample은 maxSamples까지, 중복 제거', () => {
    const b = aggregateChurn(
      [row('미결제: 무응답'), row('미결제: 무응답'), row('미결제: 보류'), row('미결제: 취소')],
      2,
    );
    const 미결제 = b.categories.find((c) => c.category === '미결제')!;
    expect(미결제.count).toBe(4);
    expect(미결제.samples.length).toBe(2);
    expect(new Set(미결제.samples).size).toBe(2);
  });
});

describe('formatChurnLines — 프롬프트 라인', () => {
  it('이탈 0명이면 빈 배열', () => {
    expect(formatChurnLines(aggregateChurn([]), '전체 누적')).toEqual([]);
  });

  it('헤더·분포·타입·대표사유 라인을 포함', () => {
    const b = aggregateChurn([
      row('미결제: 콜 무응답', 'potential'),
      row('환불: 잔여 환불', 'closed'),
    ]);
    const lines = formatChurnLines(b, '분석 기간 인입 코호트 중');
    const text = lines.join('\n');
    expect(text).toContain('이탈 2명');
    expect(text).toContain('사유 기록 2명');
    expect(text).toContain('미결제 1');
    expect(text).toContain('환불 1');
    expect(text).toContain('완전 종료 1명');
    expect(text).toContain('잠재 복귀 1명');
    expect(text).toContain('콜 무응답');
  });
});
