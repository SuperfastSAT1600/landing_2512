import { describe, it, expect } from 'vitest';
import { buildAvailability, type AvailabilitySlot } from '../student-availability';

const TODAY = new Date('2026-10-19T00:00:00Z');

function slot(over: Partial<AvailabilitySlot>): AvailabilitySlot {
  return {
    weekday: 0,
    start_minute_local: 16 * 60 + 30,
    end_minute_local: 22 * 60,
    tz: 'America/New_York',
    effective_from: '2026-10-19',
    effective_until: '2026-10-31',
    notes: null,
    ...over,
  };
}

describe('buildAvailability', () => {
  it('REQ-001: 학생 현지 월 16:30~22:00 (EDT)는 KST 화 05:30~11:00', () => {
    const { blocks } = buildAvailability([slot({})], TODAY);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].lines[0]).toMatchObject({
      weekdayKst: 1, start: '05:30', end: '11:00',
      weekdayLocal: 0, startLocal: '16:30', endLocal: '22:00',
    });
  });

  it('REQ-001: 일요일 저녁은 KST 월요일로 넘어간다 (LA 20:00~22:00 PDT)', () => {
    const { blocks } = buildAvailability([
      slot({ weekday: 6, tz: 'America/Los_Angeles', start_minute_local: 20 * 60, end_minute_local: 22 * 60 }),
    ], TODAY);
    expect(blocks[0].lines[0]).toMatchObject({ weekdayKst: 0, start: '12:00', end: '14:00', weekdayLocal: 6 });
  });

  it('REQ-002: DST 종료(11/1) 경계에서 기간을 나누고 KST만 1시간 이동한다', () => {
    const { blocks } = buildAvailability([slot({ effective_until: '2026-11-30' })], TODAY);
    expect(blocks.map((b) => b.period)).toEqual([
      '2026-10-19 ~ 2026-10-31 · EDT',
      '2026-11-01 ~ 2026-11-30 · EST',
    ]);
    expect(blocks[0].lines[0]).toMatchObject({ start: '05:30', end: '11:00', startLocal: '16:30' });
    expect(blocks[1].lines[0]).toMatchObject({ start: '06:30', end: '12:00', startLocal: '16:30' });
  });

  it('REQ-002: 종료일이 없으면 한 구간만 만든다', () => {
    const { blocks } = buildAvailability([slot({ effective_until: null })], TODAY);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].period).toBe('2026-10-19 ~');
  });

  it('REQ-002: 먼 미래 종료일(2099)이어도 빠르게 끝나고 DST 분할은 시작 후 1년까지만 한다', () => {
    const t0 = performance.now();
    const { blocks } = buildAvailability([slot({ effective_until: '2099-12-31' })], TODAY);
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(blocks.map((b) => b.period)).toEqual([
      '2026-10-19 ~ 2026-10-31 · EDT',
      '2026-11-01 ~ 2027-03-13 · EST',
      '2027-03-14 ~ 2099-12-31 · EDT',
    ]);
  });

  it('REQ-003: 슬롯이 없으면 빈 블록', () => {
    expect(buildAvailability([], TODAY).blocks).toEqual([]);
  });

  it('REQ-003: 학생 시간대 라벨과 같은 기간 슬롯 묶음, KST 요일/시간순 정렬', () => {
    const { studentTz, blocks } = buildAvailability([
      slot({ weekday: 2, start_minute_local: 18 * 60, end_minute_local: 21 * 60 }),
      slot({ weekday: 0 }),
    ], TODAY);
    expect(studentTz).toBe('America/New_York (EDT, UTC-4)');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].lines.map((l) => l.weekdayKst)).toEqual([1, 3]);
  });

  it('REQ-003: 알 수 없는 tz는 America/Los_Angeles로 대체', () => {
    const { studentTz, blocks } = buildAvailability([slot({ tz: 'Mars/Olympus', effective_until: null })], TODAY);
    expect(studentTz).toContain('America/Los_Angeles');
    // PDT(UTC-7): 16:30 + 16h = 08:30 다음날
    expect(blocks[0].lines[0]).toMatchObject({ weekdayKst: 1, start: '08:30' });
  });

  it('REQ-003: 약어가 없는 시간대(Asia/Seoul)는 "GMT+9" 대신 UTC 오프셋만 쓴다', () => {
    const { studentTz, blocks } = buildAvailability([
      slot({ tz: 'Asia/Seoul', effective_until: null }),
      slot({ tz: 'Asia/Seoul', effective_from: '2026-12-01', effective_until: '2026-12-31', weekday: 2 }),
    ], TODAY);
    expect(studentTz).toBe('Asia/Seoul (UTC+9)');
    expect(blocks.map((b) => b.period)).toEqual(['2026-10-19 ~ · UTC+9', '2026-12-01 ~ 2026-12-31 · UTC+9']);
    expect(blocks[0].lines[0]).toMatchObject({ weekdayKst: 0, start: '16:30' });
  });

  it('REQ-003: 메모를 줄에 싣는다', () => {
    const { blocks } = buildAvailability([slot({ notes: '시험 주간 제외' })], TODAY);
    expect(blocks[0].lines[0].notes).toBe('시험 주간 제외');
  });
});

describe('buildAvailability — 요일에 맞는 날짜', () => {
  it('REQ-005: 오늘 이후 가장 가까운 해당 요일의 날짜를 KST·학생 현지로 낸다', () => {
    // 학생 현지 월(10/19) 16:30 EDT = KST 화(10/20) 05:30
    const { blocks } = buildAvailability([slot({})], TODAY);
    expect(blocks[0].lines[0]).toMatchObject({ weekdayKst: 1, dateKst: '2026-10-20', weekdayLocal: 0, dateLocal: '2026-10-19' });
  });

  it('REQ-005: 일요일 저녁(LA)은 KST 월요일로 넘어가며 현지 날짜는 하루 앞선다', () => {
    const { blocks } = buildAvailability([
      slot({ weekday: 6, effective_from: '2026-10-12', tz: 'America/Los_Angeles', start_minute_local: 20 * 60, end_minute_local: 22 * 60 }),
    ], TODAY);
    expect(blocks[0].lines[0]).toMatchObject({ weekdayKst: 0, dateKst: '2026-10-19', weekdayLocal: 6, dateLocal: '2026-10-18' });
  });

  it('REQ-005: 시작일이 미래면 그날 이후 첫 해당 요일부터 센다', () => {
    const { blocks } = buildAvailability([slot({ effective_from: '2026-11-02', effective_until: null })], TODAY);
    expect(blocks[0].lines[0]).toMatchObject({ dateKst: '2026-11-03', dateLocal: '2026-11-02' });
  });

  it('REQ-005: 유효 기간은 학생 현지 달력 — 마지막 유효일의 슬롯이 KST로는 다음 날이어도 만료로 보지 않는다', () => {
    // 현지 월 10/19 16:30 EDT = KST 화 10/20 05:30
    const { blocks } = buildAvailability([slot({ effective_from: '2026-10-19', effective_until: '2026-10-19' })], TODAY);
    expect(blocks[0].lines[0]).toMatchObject({ dateKst: '2026-10-20', dateLocal: '2026-10-19' });
  });

  it('REQ-005: 유효 시작일 이전의 현지 날짜는 쓰지 않는다', () => {
    // KST 10/20이어도 현지 날짜(10/19)가 시작일(10/20)보다 앞이면 다음 주로 넘긴다
    const { blocks } = buildAvailability([slot({ effective_from: '2026-10-20', effective_until: null })], TODAY);
    expect(blocks[0].lines[0]).toMatchObject({ dateKst: '2026-10-27', dateLocal: '2026-10-26' });
  });

  it('REQ-005: 유효 기간 안에 해당 현지 요일이 없으면 날짜는 null', () => {
    const { blocks } = buildAvailability([slot({ effective_from: '2026-10-20', effective_until: '2026-10-25' })], TODAY);
    expect(blocks[0].lines[0]).toMatchObject({ dateKst: null, dateLocal: null });
  });

  it('REQ-005: DST로 나뉜 뒤 구간은 그 구간 시작 이후의 날짜를 쓴다', () => {
    const { blocks } = buildAvailability([slot({ effective_until: '2026-11-30' })], TODAY);
    expect(blocks[1].lines[0]).toMatchObject({ weekdayKst: 1, dateKst: '2026-11-03' });
  });
});

