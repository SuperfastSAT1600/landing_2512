import { describe, it, expect } from 'vitest';
import { groupTestCenterExams, localDate, sectionOfChapter, fetchAllRows, type TcAttemptRow } from '../srm-test-center';

// REQ-003
describe('localDate — 학생 시간대 날짜', () => {
  it('뉴욕 학생의 UTC 18시 응시는 그날 날짜', () => {
    expect(localDate('2026-10-04T18:04:45Z', 'America/New_York')).toBe('2026-10-04');
  });
  it('한국 학생은 KST', () => {
    expect(localDate('2026-10-04T18:04:45Z', 'Asia/Seoul')).toBe('2026-10-05');
  });
  it('시간대가 없거나 잘못되면 KST', () => {
    expect(localDate('2026-10-04T18:04:45Z', null)).toBe('2026-10-05');
    expect(localDate('2026-10-04T18:04:45Z', 'Not/AZone')).toBe('2026-10-05');
  });
});

describe('sectionOfChapter', () => {
  it('Math가 들어가면 math, 나머지는 rw', () => {
    expect(sectionOfChapter('Math')).toBe('math');
    expect(sectionOfChapter('Reading and Writing')).toBe('rw');
  });
});

// REQ-002
function row(p: Partial<TcAttemptRow> & Pick<TcAttemptRow, 'id' | 'lesson_id'>): TcAttemptRow {
  return { curriculum_id: 'c1', status: 'submitted', score: 10, total: 27, started_at: '2026-09-14T20:00:00Z', submitted_at: '2026-09-14T20:30:00Z', test_center_session_id: 's1', ...p };
}

describe('groupTestCenterExams — 시험(curriculum) 단위', () => {
  const lessons = new Map([
    ['rw1', { section: 'rw' as const, curriculumId: 'c1' }],
    ['rw2', { section: 'rw' as const, curriculumId: 'c1' }],
    ['m1', { section: 'math' as const, curriculumId: 'c1' }],
    ['m2', { section: 'math' as const, curriculumId: 'c1' }],
  ]);

  it('RW·Math를 다른 세션에서 풀어도 시험 1건', () => {
    const exams = groupTestCenterExams([
      row({ id: 'a', lesson_id: 'rw1', test_center_session_id: 's1', status: 'expired', score: 20 }),
      row({ id: 'b', lesson_id: 'rw2', test_center_session_id: 's1', status: 'expired', score: 18 }),
      row({ id: 'c', lesson_id: 'm1', test_center_session_id: 's2', score: 17, total: 22, submitted_at: '2026-09-14T21:50:00Z' }),
      row({ id: 'd', lesson_id: 'm2', test_center_session_id: 's2', score: 17, total: 22, submitted_at: '2026-09-14T22:30:00Z' }),
    ], lessons);
    expect(exams).toHaveLength(1);
    expect(exams[0].curriculumId).toBe('c1');
    expect(exams[0].takenAt).toBe('2026-09-14T22:30:00Z');
    expect(exams[0].expectedModules).toEqual({ rw: 2, math: 2 });
    expect(exams[0].attempts.map((a) => a.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('같은 레슨 중복 시도는 submitted 우선, 그다음 최신 1건만', () => {
    const exams = groupTestCenterExams([
      row({ id: 'old', lesson_id: 'rw1', status: 'submitted', submitted_at: '2026-09-14T20:10:00Z' }),
      row({ id: 'new', lesson_id: 'rw1', status: 'submitted', submitted_at: '2026-09-14T20:40:00Z' }),
      row({ id: 'exp', lesson_id: 'rw1', status: 'expired', submitted_at: null, started_at: '2026-09-14T23:00:00Z' }),
    ], lessons);
    expect(exams[0].attempts.map((a) => a.id)).toEqual(['new']);
  });

  it('진행 중(active) 시도는 빼고, 남는 게 없으면 시험도 없다', () => {
    expect(groupTestCenterExams([row({ id: 'x', lesson_id: 'rw1', status: 'active' })], lessons)).toEqual([]);
  });
});

// REQ-004
describe('fetchAllRows — 1000행 상한 넘겨 전부 읽기', () => {
  it('페이지가 꽉 차면 다음 페이지를 이어 읽는다', async () => {
    const all = Array.from({ length: 2345 }, (_, i) => ({ i }));
    const calls: [number, number][] = [];
    const rows = await fetchAllRows((from, to) => {
      calls.push([from, to]);
      return Promise.resolve({ data: all.slice(from, to + 1), error: null });
    });
    expect(rows).toHaveLength(2345);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('중간에 에러가 나면 그 전까지 읽은 것만', async () => {
    const page = Array.from({ length: 1000 }, (_, i) => ({ i }));
    const rows = await fetchAllRows((from) =>
      Promise.resolve(from === 0 ? { data: page, error: null } : { data: null, error: { message: 'x' } }),
    );
    expect(rows).toHaveLength(1000);
  });
});
