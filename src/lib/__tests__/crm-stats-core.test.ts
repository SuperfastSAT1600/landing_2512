import { describe, it, expect } from 'vitest';
import {
  parseStatsSegment,
  isCrmStatsSegment,
  relatedCompanyId,
  paymentMatchesSegment,
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

  describe('relatedCompanyId', () => {
    it('PostgREST many-to-one 임베드(단일 객체)에서 company_id를 읽는다', () => {
      expect(relatedCompanyId({ company_id: 'c1' })).toBe('c1');
      expect(relatedCompanyId({ company_id: null })).toBeNull();
    });

    it('배열 형태 임베드도 첫 원소에서 읽는다', () => {
      expect(relatedCompanyId([{ company_id: 'c1' }])).toBe('c1');
      expect(relatedCompanyId([{ company_id: null }])).toBeNull();
      expect(relatedCompanyId([])).toBeNull();
    });

    it('관계가 없으면 null이다', () => {
      expect(relatedCompanyId(null)).toBeNull();
      expect(relatedCompanyId(undefined)).toBeNull();
    });
  });

  describe('paymentMatchesSegment', () => {
    const b2cPay = { students: { company_id: null } };
    const b2bPay = { students: { company_id: 'c1' } };
    const orphanPay = { students: null }; // 학생 레코드가 없는 결제 → B2C로 본다

    it('all이면 모든 결제가 통과한다', () => {
      for (const p of [b2cPay, b2bPay, orphanPay]) {
        expect(paymentMatchesSegment(p, 'all')).toBe(true);
      }
    });

    it('b2c는 company_id가 없는 결제만 통과한다', () => {
      expect(paymentMatchesSegment(b2cPay, 'b2c')).toBe(true);
      expect(paymentMatchesSegment(orphanPay, 'b2c')).toBe(true);
      expect(paymentMatchesSegment(b2bPay, 'b2c')).toBe(false);
    });

    it('b2b는 company_id가 있는 결제만 통과한다', () => {
      expect(paymentMatchesSegment(b2bPay, 'b2b')).toBe(true);
      expect(paymentMatchesSegment(b2cPay, 'b2b')).toBe(false);
      expect(paymentMatchesSegment(orphanPay, 'b2b')).toBe(false);
    });

    it('배열 형태 임베드에서도 동일하게 판정한다', () => {
      expect(paymentMatchesSegment({ students: [{ company_id: 'c1' }] }, 'b2b')).toBe(true);
      expect(paymentMatchesSegment({ students: [{ company_id: null }] }, 'b2c')).toBe(true);
    });

    it('b2c와 b2b는 모든 결제를 겹침 없이 나눈다', () => {
      const rows = [b2cPay, b2bPay, orphanPay];
      const b2c = rows.filter((p) => paymentMatchesSegment(p, 'b2c'));
      const b2b = rows.filter((p) => paymentMatchesSegment(p, 'b2b'));
      expect(b2c.length + b2b.length).toBe(rows.length);
      expect(b2c.some((p) => b2b.includes(p))).toBe(false);
    });
  });
});
