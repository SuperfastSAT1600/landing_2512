// SRM 학습 리포트 공용 규칙 — SRM Growth Report(superfastsat app/src/app/actions/reports/test-center-report.ts)와 같은 기준.
// 순수 함수만 둔다(I/O 없음). buildSrmReport가 사용한다.

export type TcSection = 'rw' | 'math';

const DEFAULT_TZ = 'Asia/Seoul';

/** ISO 시각을 학생 시간대의 YYYY-MM-DD로. 시간대가 없거나 잘못되면 KST. */
export function localDate(iso: string, tz: string | null | undefined): string {
  const fmt = (zone: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  try {
    return fmt(tz || DEFAULT_TZ);
  } catch {
    return fmt(DEFAULT_TZ);
  }
}

/** 시험 chapter 제목으로 과목을 정한다. Math가 아니면 RW(SRM과 같은 규칙). */
export function sectionOfChapter(title: string): TcSection {
  return /math/i.test(title) ? 'math' : 'rw';
}

export interface TcAttemptRow {
  id: string;
  test_center_session_id: string | null;
  curriculum_id: string;
  lesson_id: string;
  status: string;
  score: number | null;
  total: number | null;
  started_at: string | null;
  submitted_at: string | null;
}

export interface TcLessonInfo { section: TcSection; curriculumId: string }

export interface TcExam {
  curriculumId: string;
  /** 마지막 제출(없으면 시작) 시각 — 리포트 날짜 기준 */
  takenAt: string;
  attempts: TcAttemptRow[];
  expectedModules: { rw: number; math: number };
}

const FINAL_RANK: Record<string, number> = { submitted: 2, expired: 1 };
const recency = (r: TcAttemptRow) => r.submitted_at ?? r.started_at ?? '';

function beats(next: TcAttemptRow, cur: TcAttemptRow): boolean {
  const a = FINAL_RANK[next.status] ?? 0;
  const b = FINAL_RANK[cur.status] ?? 0;
  return a !== b ? a > b : recency(next) > recency(cur);
}

/**
 * 테스트센터 레슨 시도를 시험(curriculum) 단위로 묶는다.
 * RW와 Math를 다른 접속(session)에서 풀어도 한 시험이다. 끝난 시도(submitted/expired)만 세고,
 * 같은 레슨을 여러 번 풀었으면 정본 1건(제출 우선, 그다음 최신)만 남긴다.
 */
export function groupTestCenterExams(rows: TcAttemptRow[], lessons: Map<string, TcLessonInfo>): TcExam[] {
  const best = new Map<string, TcAttemptRow>();
  for (const r of rows) {
    if (!(r.status in FINAL_RANK) || r.score == null) continue;
    const k = `${r.curriculum_id}::${r.lesson_id}`;
    const cur = best.get(k);
    if (!cur || beats(r, cur)) best.set(k, r);
  }

  const expected = new Map<string, { rw: number; math: number }>();
  for (const info of lessons.values()) {
    const e = expected.get(info.curriculumId) ?? { rw: 0, math: 0 };
    e[info.section] += 1;
    expected.set(info.curriculumId, e);
  }

  const exams = new Map<string, TcExam>();
  for (const r of best.values()) {
    const exam = exams.get(r.curriculum_id) ?? {
      curriculumId: r.curriculum_id, takenAt: '', attempts: [],
      expectedModules: expected.get(r.curriculum_id) ?? { rw: 0, math: 0 },
    };
    exam.attempts.push(r);
    const at = recency(r);
    if (at > exam.takenAt) exam.takenAt = at;
    exams.set(r.curriculum_id, exam);
  }
  return [...exams.values()].filter((e) => e.takenAt);
}

type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/** PostgREST는 요청당 1000행에서 조용히 자른다. 범위를 넘겨 가며 끝까지 읽는다(쿼리는 정렬이 고정돼야 함). */
export async function fetchAllRows<T>(page: (from: number, to: number) => Page<T>, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error || !data) {
      // 조용히 빈 리포트가 되지 않게 로그를 남긴다(읽은 데까지는 돌려준다)
      if (error) console.error('[srm-report] fetchAllRows failed', { from, error });
      break;
    }
    out.push(...data);
    if (data.length < pageSize) break;
  }
  return out;
}
