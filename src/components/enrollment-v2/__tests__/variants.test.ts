import { describe, it, expect } from 'vitest';
import { ENROLLMENT_V2, ENROLLMENT_V3, directorSavings } from '../variants';

describe('수업권 판매 구성(variant)', () => {
  // REQ-001 (enrollment-v3): v2는 기존 값 그대로
  it('v2는 관리형 3개·대표코치 10시간·자기주도 포함', () => {
    expect(ENROLLMENT_V2.managedPkgs.map((p) => [p.hours, p.totalPrice])).toEqual([
      [10, 1650000], [20, 2990000], [40, 5390000],
    ]);
    expect(ENROLLMENT_V2.directorPkgs.map((p) => [p.hours, p.totalPrice])).toEqual([[10, 2100000]]);
    expect(ENROLLMENT_V2.selfDirected).toBe(true);
  });

  it('V3는 관리형 10시간 165만원만, 자기주도(비관리형·콘텐츠) 없음', () => {
    expect(ENROLLMENT_V3.managedPkgs.map((p) => [p.hours, p.totalPrice])).toEqual([[10, 1650000]]);
    expect(ENROLLMENT_V3.selfDirected).toBe(false);
  });

  it('V3 대표코치는 10·20·40시간, 할인액은 정가(시간당 21만원) 대비', () => {
    expect(ENROLLMENT_V3.directorPkgs.map((p) => [p.hours, p.totalPrice, directorSavings(p)])).toEqual([
      [10, 2100000, 0],
      [20, 3800000, 400000],
      [40, 6860000, 1540000],
    ]);
  });
});
