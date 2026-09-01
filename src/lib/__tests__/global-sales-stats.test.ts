import { describe, it, expect } from 'vitest';
import { aggregateByCountry, aggregateByBillingType, type CountrySaleLike } from '../global-sales-stats';

const ENTRY = (over: Partial<CountrySaleLike>): CountrySaleLike => ({
  country_code: 'PK',
  payment_type: '최초결제',
  billing_type: '일회성',
  amount_usd: 100,
  ...over,
});

describe('aggregateByCountry', () => {
  it('빈 목록은 빈 배열', () => {
    expect(aggregateByCountry([])).toEqual([]);
  });

  it('같은 국가 건을 합산한다', () => {
    const rows = aggregateByCountry([
      ENTRY({ country_code: 'PK', amount_usd: 100 }),
      ENTRY({ country_code: 'PK', amount_usd: 50 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ countryCode: 'PK', total: 150, count: 2 });
  });

  it('매출 내림차순으로 정렬한다', () => {
    const rows = aggregateByCountry([
      ENTRY({ country_code: 'PK', amount_usd: 10 }),
      ENTRY({ country_code: 'AE', amount_usd: 90 }),
      ENTRY({ country_code: 'US', amount_usd: 50 }),
    ]);
    expect(rows.map((r) => r.countryCode)).toEqual(['AE', 'US', 'PK']);
  });

  it('최초결제·재결제를 나눠 집계한다', () => {
    const rows = aggregateByCountry([
      ENTRY({ country_code: 'PK', payment_type: '최초결제', amount_usd: 100 }),
      ENTRY({ country_code: 'PK', payment_type: '재결제', amount_usd: 40 }),
    ]);
    expect(rows[0].firstTotal).toBe(100);
    expect(rows[0].repeatTotal).toBe(40);
  });

  it('비중은 전체 매출 대비 퍼센트이고 합이 100이다', () => {
    const rows = aggregateByCountry([
      ENTRY({ country_code: 'PK', amount_usd: 75 }),
      ENTRY({ country_code: 'AE', amount_usd: 25 }),
    ]);
    expect(rows.find((r) => r.countryCode === 'PK')?.share).toBe(75);
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(100);
  });

  it('국가 코드가 없는 건은 미지정으로 묶는다', () => {
    const rows = aggregateByCountry([
      ENTRY({ country_code: null, amount_usd: 30 }),
      ENTRY({ country_code: null, amount_usd: 20 }),
      ENTRY({ country_code: 'PK', amount_usd: 10 }),
    ]);
    const unknown = rows.find((r) => r.countryCode === null);
    expect(unknown).toMatchObject({ total: 50, count: 2, label: '미지정' });
  });

  it('국가명 라벨에 국기와 한글명을 담는다', () => {
    const rows = aggregateByCountry([ENTRY({ country_code: 'PK' })]);
    expect(rows[0].label).toBe('🇵🇰 파키스탄 · Pakistan');
  });

  it('미지정은 매출이 커도 항상 마지막에 온다', () => {
    const rows = aggregateByCountry([
      ENTRY({ country_code: null, amount_usd: 1000 }),
      ENTRY({ country_code: 'PK', amount_usd: 10 }),
    ]);
    expect(rows.map((r) => r.countryCode)).toEqual(['PK', null]);
  });
});

describe('aggregateByBillingType', () => {
  it('빈 목록은 빈 배열', () => {
    expect(aggregateByBillingType([])).toEqual([]);
  });

  it('결제 방식별로 합산한다', () => {
    const rows = aggregateByBillingType([
      ENTRY({ billing_type: '일회성', amount_usd: 20 }),
      ENTRY({ billing_type: '일회성', amount_usd: 12 }),
      ENTRY({ billing_type: '구독', amount_usd: 12 }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.billingType === '일회성')).toMatchObject({ total: 32, count: 2 });
    expect(rows.find((r) => r.billingType === '구독')).toMatchObject({ total: 12, count: 1 });
  });

  it('매출 내림차순으로 정렬한다', () => {
    const rows = aggregateByBillingType([
      ENTRY({ billing_type: '일회성', amount_usd: 10 }),
      ENTRY({ billing_type: '구독', amount_usd: 90 }),
    ]);
    expect(rows.map((r) => r.billingType)).toEqual(['구독', '일회성']);
  });

  it('비중 합은 100이다', () => {
    const rows = aggregateByBillingType([
      ENTRY({ billing_type: '일회성', amount_usd: 75 }),
      ENTRY({ billing_type: '구독', amount_usd: 25 }),
    ]);
    expect(rows.find((r) => r.billingType === '구독')?.share).toBe(25);
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(100);
  });

  it('없는 방식은 행을 만들지 않는다', () => {
    const rows = aggregateByBillingType([ENTRY({ billing_type: '구독' })]);
    expect(rows.map((r) => r.billingType)).toEqual(['구독']);
  });

  it('라벨은 방식 이름 그대로다', () => {
    expect(aggregateByBillingType([ENTRY({ billing_type: '구독' })])[0].label).toBe('구독');
  });
});
