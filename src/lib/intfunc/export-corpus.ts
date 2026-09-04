/**
 * Supabase → 코퍼스 행. 스크립트와 CRM 라우트가 함께 쓰는 단일 경로.
 *
 * 두 벌로 갈라지면 한쪽만 절단·비식별 규칙을 따라가는 날이 온다. 그 어긋남은 학습이
 * 끝난 뒤에야 드러나므로, 읽기와 쓰기를 여기 한 곳에 둔다.
 *
 * Supabase 클라이언트를 인자로 받는다 — 라우트는 supabaseAdmin을, 스크립트는 자기
 * 클라이언트를 넘긴다.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildCorpus, type StudentInput, type CallInput, type BuildStats } from './corpus-row';
import type { CorpusRow } from './corpus-row';

const FETCH_PAGE = 500; // Supabase 1000행 캡 회피

/**
 * 결과가 확정된 학생만 코퍼스 대상이다 — 진행 중인 단계는 라벨이 없다.
 * `'8'`이 결제 완료다(수업 중으로 자동 전환, enrollment-state.ts). `'9'`는 존재하지 않는다.
 */
export const LABELLED_STAGES = ['8', 'churned'];

const STUDENT_COLUMNS =
  'id, name, funnel_stage, funnel_stage_updated_at, stage_history, grade, ' +
  'school_type, desired_subjects, target_score, previous_rw_score, previous_math_score';
// recording_name이 빠지면 통화 종류를 못 가려 전부 unknown이 된다 (classify-call.ts).
const CALL_COLUMNS =
  'student_id, source, recording_name, recorded_at, created_at, duration_sec, transcript';

async function fetchStudents(db: SupabaseClient, limit: number | null): Promise<StudentInput[]> {
  const rows: StudentInput[] = [];
  for (let from = 0; ; from += FETCH_PAGE) {
    const { data, error } = await db
      .from('students')
      .select(STUDENT_COLUMNS)
      .in('funnel_stage', LABELLED_STAGES)
      .order('id')
      .range(from, from + FETCH_PAGE - 1);
    if (error) throw new Error(`students 조회 실패: ${error.message}`);
    if (!data?.length) break;
    rows.push(...(data as unknown as StudentInput[]));
    if (limit && rows.length >= limit) return rows.slice(0, limit);
    if (data.length < FETCH_PAGE) break;
  }
  return rows;
}

/** 전사 전량. 학생별 묶기는 buildCorpus가 한다. */
async function fetchCalls(db: SupabaseClient): Promise<CallInput[]> {
  const rows: CallInput[] = [];
  for (let from = 0; ; from += FETCH_PAGE) {
    const { data, error } = await db
      .from('call_transcripts')
      .select(CALL_COLUMNS)
      .order('id')
      .range(from, from + FETCH_PAGE - 1);
    if (error) throw new Error(`call_transcripts 조회 실패: ${error.message}`);
    if (!data?.length) break;
    rows.push(...(data as unknown as CallInput[]));
    if (data.length < FETCH_PAGE) break;
  }
  return rows;
}

export async function exportCorpus(
  db: SupabaseClient,
  limit: number | null = null
): Promise<{ rows: CorpusRow[]; stats: BuildStats }> {
  const students = await fetchStudents(db, limit);
  const calls = await fetchCalls(db);
  return buildCorpus(students, calls);
}
