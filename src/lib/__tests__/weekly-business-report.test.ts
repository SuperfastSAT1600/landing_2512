import { describe, it, expect } from 'vitest';
import {
  lastCompletedWeek,
  splitLeadsBySource,
  summarizeGlobalSales,
  formatBusinessReport,
  type ReportSegment,
  type GlobalReportSummary,
  type GlobalSaleEntryLike,
} from '@/lib/weekly-business-report';

describe('lastCompletedWeek (REQ-002)', () => {
  it('월요일 04:00 KST → 직전 완결 주차(전주 월~일)', () => {
    expect(lastCompletedWeek(new Date('2026-08-10T04:00:00+09:00'))).toEqual({
      label: '26년 08월 01주차',
      start: '2026-08-03',
      end: '2026-08-09',
    });
  });

  it('다음 주 월요일은 그 다음 주차를 반환한다', () => {
    expect(lastCompletedWeek(new Date('2026-08-17T04:00:00+09:00'))?.label).toBe('26년 08월 02주차');
    expect(lastCompletedWeek(new Date('2026-08-24T04:00:00+09:00'))?.label).toBe('26년 08월 03주차');
  });

  it('UTC 표기로 같은 순간을 주면 동일한 주차', () => {
    // 2026-08-09T19:00Z == 2026-08-10T04:00+09:00
    expect(lastCompletedWeek(new Date('2026-08-09T19:00:00Z'))).toEqual(
      lastCompletedWeek(new Date('2026-08-10T04:00:00+09:00')),
    );
  });

  it('KST 자정 직후에도 전날(일요일)이 속한 주차를 본다', () => {
    expect(lastCompletedWeek(new Date('2026-08-10T00:10:00+09:00'))?.end).toBe('2026-08-09');
  });

  it('월요일이 아닌 날 실행되면 진행 중인 주가 아니라 그 전 완결 주차를 본다', () => {
    // 크론 지연·재시도·수동 실행 대비: 목요일에 돌아도 08/10~08/16(진행 중)이 아니라 08/03~08/09
    expect(lastCompletedWeek(new Date('2026-08-13T09:00:00+09:00'))).toEqual({
      label: '26년 08월 01주차',
      start: '2026-08-03',
      end: '2026-08-09',
    });
  });

  it('일요일 밤(주 마지막 날)에 실행되면 그 주는 아직 완결이 아니다', () => {
    expect(lastCompletedWeek(new Date('2026-08-16T23:00:00+09:00'))?.end).toBe('2026-08-09');
  });

  it('주차 정의 범위 밖이면 null', () => {
    expect(lastCompletedWeek(new Date('2030-01-07T04:00:00+09:00'))).toBeNull();
  });
});

describe('splitLeadsBySource (REQ-004)', () => {
  it('인스타 소스와 그 외를 나눈다', () => {
    expect(
      splitLeadsBySource([
        { source: '인스타그램 광고', leads: 9 },
        { source: '소개', leads: 8 },
      ]),
    ).toEqual({ ig: 9, other: 8 });
  });

  it('인스타 변형 라벨도 부분일치로 합산한다', () => {
    expect(
      splitLeadsBySource([
        { source: '인스타그램 광고', leads: 9 },
        { source: '인스타그램 자연유입', leads: 2 },
        { source: '네이버 블로그', leads: 3 },
      ]),
    ).toEqual({ ig: 11, other: 3 });
  });

  it('인스타 소스가 없으면 ig=0', () => {
    expect(splitLeadsBySource([{ source: 'B2B 파트너', leads: 2 }])).toEqual({ ig: 0, other: 2 });
  });

  it('빈 배열은 0/0', () => {
    expect(splitLeadsBySource([])).toEqual({ ig: 0, other: 0 });
  });
});

// 2026-08-03~08-09 실측값
const WEEK = { label: '26년 08월 01주차', start: '2026-08-03', end: '2026-08-09' };

const GLOBAL: GlobalReportSummary = {
  totalUsd: 800, totalCount: 2,
  firstUsd: 500, firstCount: 1,
  repeatUsd: 300, repeatCount: 1,
};

const NO_GLOBAL: GlobalReportSummary = {
  totalUsd: 0, totalCount: 0, firstUsd: 0, firstCount: 0, repeatUsd: 0, repeatCount: 0,
};

const SEGMENTS: ReportSegment[] = [
  {
    label: '한국비즈니스',
    igLeads: 9,
    otherLeads: 8,
    overview: {
      total_leads: 17, contacted: 8, contact_rate: 47.06, paid: 4, conversion_rate: 50,
      gross_revenue: 33704000, total_refund: 0, total_revenue: 33704000, total_net_revenue: 30333600,
      first_payment_revenue: 15434000, repayment_revenue: 18270000,
      gross_count: 10, refund_count: 0, first_payment_count: 5, repayment_count: 5,
    },
  },
  {
    label: 'B2C',
    igLeads: 9,
    otherLeads: 6,
    overview: {
      total_leads: 15, contacted: 6, contact_rate: 40, paid: 2, conversion_rate: 33.33,
      gross_revenue: 23909000, total_refund: 0, total_revenue: 23909000, total_net_revenue: 21518100,
      first_payment_revenue: 10629000, repayment_revenue: 13280000,
      gross_count: 7, refund_count: 0, first_payment_count: 3, repayment_count: 4,
    },
  },
  {
    label: 'B2B',
    igLeads: 0,
    otherLeads: 2,
    overview: {
      total_leads: 2, contacted: 2, contact_rate: 100, paid: 2, conversion_rate: 100,
      gross_revenue: 9795000, total_refund: 0, total_revenue: 9795000, total_net_revenue: 8815500,
      first_payment_revenue: 4805000, repayment_revenue: 4990000,
      gross_count: 3, refund_count: 0, first_payment_count: 2, repayment_count: 1,
    },
  },
];

describe('summarizeGlobalSales (REQ-005)', () => {
  const ENTRIES: GlobalSaleEntryLike[] = [
    { amount_usd: 500, payment_type: '최초결제', sale_date: '2026-08-05' },
    { amount_usd: 300, payment_type: '재결제', sale_date: '2026-08-08' },
    { amount_usd: 999, payment_type: '최초결제', sale_date: '2026-08-02' }, // 주차 밖(이전 주)
    { amount_usd: 111, payment_type: '재결제', sale_date: '2026-08-10' }, // 주차 밖(다음 주)
  ];

  it('주차 범위 안의 항목만 최초결제/재결제로 나눠 집계한다', () => {
    expect(summarizeGlobalSales(ENTRIES, WEEK)).toEqual({
      totalUsd: 800, totalCount: 2,
      firstUsd: 500, firstCount: 1,
      repeatUsd: 300, repeatCount: 1,
    });
  });

  it('빈 배열이나 주차 밖 항목만 있으면 전부 0', () => {
    expect(summarizeGlobalSales([], WEEK)).toEqual(NO_GLOBAL);
    expect(
      summarizeGlobalSales(
        [{ amount_usd: 100, payment_type: '최초결제', sale_date: '2026-08-01' }],
        WEEK,
      ),
    ).toEqual(NO_GLOBAL);
  });
});

describe('formatBusinessReport (REQ-003)', () => {
  it('합의된 형식 그대로 렌더링한다 — 전체(한국비즈니스+글로벌 합산)/한국비즈니스/B2C/B2B/글로벌 순서', () => {
    expect(formatBusinessReport(WEEK, SEGMENTS, GLOBAL)).toBe(
      [
        '*비즈니스 현황 · 26년 08월 01주차*',
        '2026-08-03 ~ 2026-08-09 · 금액 단위: 만원',
        '',
        '*전체*',
        '총매출 3,482 · 순매출 3,482 · 순수익 3,145',
        '한국비즈니스 97% · 글로벌 3% (글로벌은 1$=1,400원 환산)',
        '',
        '*한국비즈니스*',
        '리드 17 → 컨택 8 (47.06%) → 결제 4명 (50%)',
        '리드 구성: 인스타 9 · 그 외 8',
        '총매출 3,370 (10건) · 환불 0 (0건)',
        '순매출 3,370 · 순수익 3,033',
        '최초결제 1,543 (5건) · 재결제 1,827 (5건)',
        '',
        '*B2C*',
        '리드 15 → 컨택 6 (40%) → 결제 2명 (33.33%)',
        '리드 구성: 인스타 9 · 그 외 6',
        '총매출 2,391 (7건) · 환불 0 (0건)',
        '순매출 2,391 · 순수익 2,152',
        '최초결제 1,063 (3건) · 재결제 1,328 (4건)',
        '',
        '*B2B*',
        '리드 2 → 컨택 2 (100%) → 결제 2명 (100%)',
        '리드 구성: 인스타 0 · 그 외 2',
        '총매출 980 (3건) · 환불 0 (0건)',
        '순매출 980 · 순수익 882',
        '최초결제 481 (2건) · 재결제 499 (1건)',
        '',
        '*글로벌*',
        '총매출 $800 (2건)',
        '최초결제 $500 (1건) · 재결제 $300 (1건)',
      ].join('\n'),
    );
  });

  it('환불이 있으면 음수로 표기한다', () => {
    const withRefund: ReportSegment[] = [
      {
        ...SEGMENTS[0],
        overview: {
          ...SEGMENTS[0].overview,
          total_refund: -1429525,
          total_revenue: 33704000 - 1429525,
          refund_count: 1,
        },
      },
    ];
    const text = formatBusinessReport(WEEK, withRefund, NO_GLOBAL);
    expect(text).toContain('환불 -143 (1건)');
    expect(text).toContain('순매출 3,227');
  });

  it('리드·결제가 0인 세그먼트도 0으로 표기하고 NaN을 만들지 않는다', () => {
    const empty: ReportSegment[] = [
      {
        label: 'B2B',
        igLeads: 0,
        otherLeads: 0,
        overview: {
          total_leads: 0, contacted: 0, contact_rate: 0, paid: 0, conversion_rate: 0,
          gross_revenue: 0, total_refund: 0, total_revenue: 0, total_net_revenue: 0,
          first_payment_revenue: 0, repayment_revenue: 0,
          gross_count: 0, refund_count: 0, first_payment_count: 0, repayment_count: 0,
        },
      },
    ];
    const text = formatBusinessReport(WEEK, empty, NO_GLOBAL);
    expect(text).not.toMatch(/NaN|undefined/);
    expect(text).toContain('리드 0 → 컨택 0 (0%) → 결제 0명 (0%)');
    expect(text).toContain('총매출 0 (0건) · 환불 0 (0건)');
    expect(text).toContain('한국비즈니스 0% · 글로벌 0%'); // 매출 0일 때 분모 0 나눗셈으로 NaN%가 되지 않는다
  });

  it('이모지·해설 문구를 넣지 않는다', () => {
    const text = formatBusinessReport(WEEK, SEGMENTS, GLOBAL);
    expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    expect(text).not.toContain('짚어볼');
    expect(text).not.toContain('테스트');
  });
});
