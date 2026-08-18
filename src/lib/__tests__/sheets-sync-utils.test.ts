import { describe, it, expect } from 'vitest';
import {
  normalizePhone,
  generateLeadName,
  normalizeGrade,
  normalizeTargetScore,
  mapTestDateText,
  buildCrmPayload,
} from '../sheets-sync-utils';
import type { SheetsSyncPayload } from '../sheets-sync-utils';

// ─── REQ-002: 전화번호 정규화 ────────────────────────────────────────────────

describe('normalizePhone', () => {
  it('+82 국제번호 → 010 변환', () => {
    expect(normalizePhone('+821012345678')).toBe('01012345678');
  });
  it('+82 공백 포함', () => {
    expect(normalizePhone('+82 10-1234-5678')).toBe('01012345678');
  });
  it('하이픈 제거', () => {
    expect(normalizePhone('010-1234-5678')).toBe('01012345678');
  });
  it('공백 제거', () => {
    expect(normalizePhone('010 1234 5678')).toBe('01012345678');
  });
  it('이미 정규화된 번호는 그대로', () => {
    expect(normalizePhone('01012345678')).toBe('01012345678');
  });
  it('0 접두사 없이 시작하는 번호 (821012345678)', () => {
    expect(normalizePhone('821012345678')).toBe('01012345678');
  });
  it('해외 번호 (미국 +1)는 원형 유지', () => {
    const result = normalizePhone('+13235680868');
    expect(result).toBe('+13235680868');
  });
});

// ─── REQ-004: 자동 이름 생성 ─────────────────────────────────────────────────

describe('generateLeadName', () => {
  it('META리드_인스턴트폼 → META리드_YYYYMMDD', () => {
    expect(generateLeadName('META리드_인스턴트폼', '2026-02-14T00:56:00')).toBe('META리드_20260214');
  });
  it('META리드_인스턴트폼_목표시험 → META목표시험_YYYYMMDD', () => {
    expect(generateLeadName('META리드_인스턴트폼_목표시험', '2026-02-20T10:56:00')).toBe('META목표시험_20260220');
  });
  it('AP수업 문의 → AP문의_YYYYMMDD', () => {
    expect(generateLeadName('AP수업 문의', '2026-03-07T07:48:00')).toBe('AP문의_20260307');
  });
  it('SuperTest 수요조사 → SuperTest_YYYYMMDD', () => {
    expect(generateLeadName('SuperTest 수요조사', '2026-04-23T02:47:00')).toBe('SuperTest_20260423');
  });
  it('알 수 없는 탭 → 리드_YYYYMMDD', () => {
    expect(generateLeadName('기타탭', '2026-05-01T00:00:00')).toBe('리드_20260501');
  });
});

// ─── REQ-005: 학년 정규화 ────────────────────────────────────────────────────

describe('normalizeGrade', () => {
  it('고1 → 10th', () => expect(normalizeGrade('고1')).toBe('10th'));
  it('고2 → 11th', () => expect(normalizeGrade('고2')).toBe('11th'));
  it('고3 → 12th', () => expect(normalizeGrade('고3')).toBe('12th'));
  it('중3 → 9th',  () => expect(normalizeGrade('중3')).toBe('9th'));
  it('중2 → 8th',  () => expect(normalizeGrade('중2')).toBe('8th'));
  it('G10 → 10th', () => expect(normalizeGrade('G10')).toBe('10th'));
  it('9학년 → 9th', () => expect(normalizeGrade('9학년')).toBe('9th'));
  it('11 (숫자 단독) → 11th', () => expect(normalizeGrade('11')).toBe('11th'));
  it('junior → 11th', () => expect(normalizeGrade('junior')).toBe('11th'));
  it('rising g10 → 10th', () => expect(normalizeGrade('rising g10')).toBe('10th'));
  it('비정형 → 기타', () => expect(normalizeGrade('대학생 1학년')).toBe('기타'));
  it('빈값 → 기타', () => expect(normalizeGrade('')).toBe('기타'));
  it('y9(g8) 형식 → 9th (첫 번째 숫자 우선)', () => expect(normalizeGrade('y9(g8)')).toBe('9th'));
});

// ─── REQ-006: 목표점수 정규화 ────────────────────────────────────────────────

describe('normalizeTargetScore', () => {
  it('숫자 그대로', () => expect(normalizeTargetScore('1500')).toBe(1500));
  it('범위 → 하한값', () => expect(normalizeTargetScore('1570-1600')).toBe(1570));
  it('+ 접미사', () => expect(normalizeTargetScore('1500+')).toBe(1500));
  it('이상 접미사', () => expect(normalizeTargetScore('1400이상')).toBe(1400));
  it('만점 → 1600', () => expect(normalizeTargetScore('만점')).toBe(1600));
  it('모름 → null', () => expect(normalizeTargetScore('모름')).toBeNull());
  it('고득점 → null', () => expect(normalizeTargetScore('고득점')).toBeNull());
  it('undefined → null', () => expect(normalizeTargetScore(undefined)).toBeNull());
  it('점 접미사', () => expect(normalizeTargetScore('1550점이상')).toBe(1550));
  it('1600^^', () => expect(normalizeTargetScore('1600^^')).toBe(1600));
});

// ─── REQ-007: 목표시험날짜 매핑 ─────────────────────────────────────────────

describe('mapTestDateText', () => {
  it('26년_5월_시험 → 2026-05-03', () => expect(mapTestDateText('26년_5월_시험')).toBe('2026-05-03'));
  it('26년_6월_시험 → 2026-06-07', () => expect(mapTestDateText('26년_6월_시험')).toBe('2026-06-07'));
  it('26년_8월_시험 → 2026-08-23', () => expect(mapTestDateText('26년_8월_시험')).toBe('2026-08-23'));
  it('26년_9월_시험 → 2026-09-13', () => expect(mapTestDateText('26년_9월_시험')).toBe('2026-09-13'));
  it('26년_4분기_시험 → 2026-10-04', () => expect(mapTestDateText('26년_4분기_시험(10,11,12월)')).toBe('2026-10-04'));
  it('27년_상반기_시험 → 2027-03-08', () => expect(mapTestDateText('27년_상반기_시험')).toBe('2027-03-08'));
  it('27년_하반기_시험 → 2027-08-22', () => expect(mapTestDateText('27년_하반기_시험')).toBe('2027-08-22'));
  it('undefined → null', () => expect(mapTestDateText(undefined)).toBeNull());
  it('알 수 없는 텍스트 → null', () => expect(mapTestDateText('언젠가')).toBeNull());
});

// ─── REQ-008: 탭별 필드 매핑 ─────────────────────────────────────────────────

describe('buildCrmPayload', () => {
  const basePayload: SheetsSyncPayload = {
    source_tab: 'META리드_인스턴트폼',
    created_time: '2026-02-14T00:56:00',
    ad_name: '23)26여름방학특강_2',
    platform: 'ig',
    phone: '+821099552737',
    grade: 'y9(g8)',
    target_score_text: '1570-1600',
  };

  it('Tab1: 필수 CRM 필드 모두 존재', () => {
    const result = buildCrmPayload(basePayload);
    expect(result.name).toBe('META리드_20260214');
    expect(result.parent_phone).toBe('01099552737');
    expect(result.grade).toBe('9th');
    expect(result.target_score).toBe(1570);
    expect(result.traffic_source).toBe('인스타그램 광고');
    expect(result.inquiry_channel).toBe('인스타그램 링크');
    expect(result.school_type).toBe('한국 학제');
    expect(result.desired_subjects).toBe('Both');
    expect(result.lead_type).toBe('B2C');
    expect(result.campaign_tags).toContain('META 리드');
    // ad_name은 campaign_tags가 아닌 전용 컬럼에 저장됨 (migration 036)
    expect(result.ad_name).toBe('23)26여름방학특강_2');
  });

  it('Tab2: target_test_date 매핑', () => {
    const p: SheetsSyncPayload = {
      source_tab: 'META리드_인스턴트폼_목표시험',
      created_time: '2026-02-20T10:56:00',
      ad_name: '23)26여름방학특강_2(목표 점수 시험)',
      platform: 'ig',
      phone: '+821093904987',
      grade: '11',
      target_test_date_text: '26년_9월_시험',
    };
    const result = buildCrmPayload(p);
    expect(result.name).toBe('META목표시험_20260220');
    expect(result.target_test_date).toBe('2026-09-13');
    expect(result.campaign_tags).toContain('META 리드');
    expect(result.campaign_tags).toContain('목표시험 조사');
  });

  it('Tab3: AP 문의 과목이 campaign_tags에 포함', () => {
    const p: SheetsSyncPayload = {
      source_tab: 'AP수업 문의',
      created_time: '2026-03-07T07:48:00',
      ad_name: '25)AP시험 대비',
      platform: 'fb',
      phone: '+6281806740564',
      ap_subject: 'bio/ chemistry',
    };
    const result = buildCrmPayload(p);
    expect(result.name).toBe('AP문의_20260307');
    expect(result.campaign_tags).toContain('AP 문의');
    expect(result.campaign_tags).toContain('bio/ chemistry');
  });

  it('Tab4: SuperTest 수요조사 날짜가 campaign_tags에 포함', () => {
    const p: SheetsSyncPayload = {
      source_tab: 'SuperTest 수요조사',
      created_time: '2026-04-23T02:47:00',
      ad_name: 'supertest 수요조사',
      platform: 'ig',
      phone: '+821094076162',
      grade: '고2',
      supertest_date: '04월_25일',
    };
    const result = buildCrmPayload(p);
    expect(result.name).toBe('SuperTest_20260423');
    expect(result.campaign_tags).toContain('SuperTest 수요조사');
    expect(result.campaign_tags).toContain('04월_25일');
  });

  it('fb 플랫폼도 인스타그램 광고로 매핑', () => {
    const p: SheetsSyncPayload = { ...basePayload, platform: 'fb' };
    expect(buildCrmPayload(p).traffic_source).toBe('인스타그램 광고');
  });

  it('inquiry_date가 created_time의 날짜+시분 (나이브 KST)', () => {
    const result = buildCrmPayload(basePayload);
    expect(result.inquiry_date).toBe('2026-02-14T00:56:00');
  });

  it('UTC Z 접미사 → KST 변환 (9시간 추가)', () => {
    const utcPayload: SheetsSyncPayload = { ...basePayload, created_time: '2026-02-13T15:56:00.000Z' };
    const result = buildCrmPayload(utcPayload);
    expect(result.inquiry_date).toBe('2026-02-14T00:56:00');
  });

  it('+09:00 오프셋 → KST 그대로', () => {
    const p: SheetsSyncPayload = { ...basePayload, created_time: '2026-03-07T20:45:53+09:00' };
    expect(buildCrmPayload(p).inquiry_date).toBe('2026-03-07T20:45:53');
  });

  it('-05:00 오프셋 → KST 변환 (+14시간)', () => {
    const p: SheetsSyncPayload = { ...basePayload, created_time: '2026-03-10T16:56:47-05:00' };
    expect(buildCrmPayload(p).inquiry_date).toBe('2026-03-11T06:56:47');
  });
});
