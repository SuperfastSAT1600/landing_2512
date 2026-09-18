import { describe, expect, it } from 'vitest';
import { sortByNextContact } from '../renewal-sort';

interface Row {
  id: string;
  next_contact_date: string | null;
  stage_updated_at: string;
}

function row(id: string, date: string | null, updated: string): Row {
  return { id, next_contact_date: date, stage_updated_at: updated };
}

const ids = (rows: Row[]) => rows.map((r) => r.id);

describe('sortByNextContact', () => {
  it('예정일이 가까운 순으로 올린다', () => {
    const rows = [
      row('next-week', '2026-09-24', '2026-09-17T00:00:00Z'),
      row('tomorrow', '2026-09-18', '2026-09-10T00:00:00Z'),
      row('today', '2026-09-17', '2026-09-01T00:00:00Z'),
    ];
    expect(ids(sortByNextContact(rows))).toEqual(['today', 'tomorrow', 'next-week']);
  });

  it('지난 날짜가 맨 위에 온다 — 밀린 약속이 가장 급하다', () => {
    const rows = [
      row('today', '2026-09-17', '2026-09-17T00:00:00Z'),
      row('overdue-old', '2026-09-01', '2026-09-17T00:00:00Z'),
      row('overdue-recent', '2026-09-15', '2026-09-17T00:00:00Z'),
    ];
    expect(ids(sortByNextContact(rows))).toEqual(['overdue-old', 'overdue-recent', 'today']);
  });

  it('예정일 미입력 카드는 날짜가 잡힌 카드 아래로 내려간다', () => {
    const rows = [
      row('none', null, '2026-09-17T00:00:00Z'),
      row('dated', '2026-12-31', '2026-09-01T00:00:00Z'),
    ];
    expect(ids(sortByNextContact(rows))).toEqual(['dated', 'none']);
  });

  it('미입력끼리는 기존 순서(stage_updated_at 최신순)를 지킨다', () => {
    const rows = [
      row('old', null, '2026-09-01T00:00:00Z'),
      row('new', null, '2026-09-16T00:00:00Z'),
      row('mid', null, '2026-09-10T00:00:00Z'),
    ];
    expect(ids(sortByNextContact(rows))).toEqual(['new', 'mid', 'old']);
  });

  it('같은 예정일이면 stage_updated_at 최신순으로 가른다', () => {
    const rows = [
      row('older', '2026-09-18', '2026-09-01T00:00:00Z'),
      row('newer', '2026-09-18', '2026-09-16T00:00:00Z'),
    ];
    expect(ids(sortByNextContact(rows))).toEqual(['newer', 'older']);
  });

  it('원본 배열을 변형하지 않는다', () => {
    const rows = [
      row('b', '2026-09-20', '2026-09-01T00:00:00Z'),
      row('a', '2026-09-18', '2026-09-01T00:00:00Z'),
    ];
    const before = ids(rows);
    sortByNextContact(rows);
    expect(ids(rows)).toEqual(before);
  });
});
