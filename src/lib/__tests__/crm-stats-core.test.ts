import { describe, it, expect } from 'vitest';
import {
  parseStatsSegment,
  isCrmStatsSegment,
  filterPaymentsBySegment,
  type CrmStatsSegment,
} from '@/lib/crm-stats-core';

describe('crm-stats-core segment helpers', () => {
  describe('parseStatsSegment', () => {
    it.each([
      ['all', 'all'],
      ['b2c', 'b2c'],
      ['b2b', 'b2b'],
      [null, 'all'],
      ['', 'all'],
      ['unknown', 'all'],
    ] as [string | null, CrmStatsSegment][])('parse %s -> %s', (input, expected) => {
      expect(parseStatsSegment(input)).toBe(expected);
    });
  });

  describe('isCrmStatsSegment', () => {
    it.each(['all', 'b2c', 'b2b'])('%s는 유효한 segment다', (v) => {
      expect(isCrmStatsSegment(v)).toBe(true);
    });

    it.each(['foo', 'B2C', 'B2B', ''])('%s는 유효하지 않은 segment다', (v) => {
      expect(isCrmStatsSegment(v)).toBe(false);
    });
  });

  describe('filterPaymentsBySegment', () => {
    const students = [
      { id: 'b2c-1', name: '김B2C' },
      { id: 'b2b-1', name: '이B2B' },
    ];

    const payments = [
      { student_id: 'b2c-1', student_name: '김B2C' },
      { student_id: 'b2b-1', student_name: '이B2B' },
      { student_id: null, student_name: '김B2C' }, // 이름 폴백
      { student_id: null, student_name: '박외부' }, // 어디에도 속하지 않음
    ];

    it('all이면 필터링하지 않는다', () => {
      const result = filterPaymentsBySegment(payments, students, 'all');
      expect(result).toHaveLength(4);
    });

    it('b2c는 company_id가 null인 학생의 결제만 반환한다', () => {
      const result = filterPaymentsBySegment(payments, [students[0]], 'b2c');
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.student_name)).toEqual(['김B2C', '김B2C']);
    });

    it('b2b는 company_id가 null이 아닌 학생의 결제만 반환한다', () => {
      const result = filterPaymentsBySegment(payments, [students[1]], 'b2b');
      expect(result).toHaveLength(1);
      expect(result[0].student_id).toBe('b2b-1');
    });

    it('빈 students면 빈 배열을 반환한다', () => {
      const result = filterPaymentsBySegment(payments, [], 'b2c');
      expect(result).toHaveLength(0);
    });
  });
});
