import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { runBackfill, type BackfillDeps, type StudentTimeline } from '@/lib/plaud-backfill-run';
import { getPlaudFile, listPlaudRecordings, PLAUD_ACCOUNTS } from '@/lib/plaud-client';
import { transcribeAudioUrl } from '@/lib/plaud-transcribe';
import { insertCallTranscript, findTranscriptByExternalId } from '@/lib/call-transcripts';
import { ASR_MODEL } from '@/lib/qwen-asr';
import { BACKFILL_BUDGET_MS, BACKFILL_MAX_POLLS } from '@/lib/plaud-backfill-limits';

// 전사 폴링 때문에 한 건만으로도 오래 걸린다.
// 리터럴로 둔다 — Next가 이 값을 정적으로 읽는다. BACKFILL_MAX_DURATION_S와 같아야 하고,
// 라우트 테스트가 두 값을 묶어둔다.
export const maxDuration = 300;

const FETCH_PAGE = 500;
const RECORDING_PAGE_SIZE = 100;
const MAX_RECORDING_PAGES = 20;

async function fetchStudents(): Promise<StudentTimeline[]> {
  const rows: StudentTimeline[] = [];
  for (let from = 0; ; from += FETCH_PAGE) {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('id, consultation_timeline')
      .order('id')
      .range(from, from + FETCH_PAGE - 1);
    if (error) throw new Error(`students 조회 실패: ${error.message}`);
    if (!data?.length) break;
    rows.push(...(data as unknown as StudentTimeline[]));
    if (data.length < FETCH_PAGE) break;
  }
  return rows;
}

/** 이미 전사가 있는 엔트리 id만 읽는다 — 전사 본문은 가져오지 않는다. */
async function fetchCapturedEntryIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let from = 0; ; from += FETCH_PAGE) {
    const { data, error } = await supabaseAdmin
      .from('call_transcripts')
      .select('timeline_entry_id')
      .not('timeline_entry_id', 'is', null)
      .range(from, from + FETCH_PAGE - 1);
    if (error) throw new Error(`call_transcripts 조회 실패: ${error.message}`);
    if (!data?.length) break;
    for (const r of data as { timeline_entry_id: string }[]) ids.add(r.timeline_entry_id);
    if (data.length < FETCH_PAGE) break;
  }
  return ids;
}

async function fetchAllRecordings(accountKey: string) {
  const all = [];
  for (let page = 1; page <= MAX_RECORDING_PAGES; page++) {
    const batch = await listPlaudRecordings({ page, page_size: RECORDING_PAGE_SIZE }, accountKey);
    all.push(...batch);
    if (batch.length < RECORDING_PAGE_SIZE) break;
  }
  return all;
}

/**
 * POST /api/crm/plaud/backfill-transcripts
 * 메모는 있는데 전사가 없는 상담 건을 찾아 전사·저장한다(관리자 인증 필요).
 *
 * 한 번의 호출은 시간 예산 안에서 처리할 수 있는 만큼만 하고 남은 건수를 돌려준다.
 * 전사 1건이 최대 BACKFILL_MAX_POLLS x 3s라 전체를 한 요청에 담을 수 없다 — 호출자가
 * remaining이 0이 될 때까지 반복 호출한다. 재호출은 안전하다(이미 저장된 건은 자동 제외).
 *
 * Body: { account_key?: string, limit?: number }
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { account_key?: unknown; limit?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // 본문 없이 호출해도 기본값으로 동작한다.
  }

  const accountKey = typeof body.account_key === 'string' ? body.account_key.trim() : '';
  if (accountKey && !PLAUD_ACCOUNTS.some((a) => a.key === accountKey)) {
    return NextResponse.json({ error: `알 수 없는 계정: ${accountKey}` }, { status: 400 });
  }
  const limit = typeof body.limit === 'number' && body.limit > 0 ? Math.floor(body.limit) : undefined;

  const deps: BackfillDeps = {
    listStudents: fetchStudents,
    listCapturedEntryIds: fetchCapturedEntryIds,
    listRecordings: fetchAllRecordings,
    getFile: getPlaudFile,
    // 폴링 상한을 낮춰 준다 — 예산이 꽉 찬 순간 시작된 마지막 한 건까지
    // maxDuration 안에 끝나야 이 배치의 리포트를 돌려줄 수 있다.
    transcribe: (url: string) => transcribeAudioUrl(url, { maxPolls: BACKFILL_MAX_POLLS }),
    insert: insertCallTranscript,
    // 한 녹음이 메모 여럿에 붙는 경우 기존 전사를 재사용한다(#297) — ASR 재과금 방지.
    findExisting: findTranscriptByExternalId,
    log: (m) => console.log('[crm/plaud-backfill]', m),
  };

  try {
    const report = await runBackfill(deps, {
      accounts: accountKey ? [accountKey] : PLAUD_ACCOUNTS.map((a) => a.key),
      ...(limit !== undefined ? { limit } : {}),
      budgetMs: BACKFILL_BUDGET_MS,
      asrModel: ASR_MODEL,
    });
    return NextResponse.json({ data: report });
  } catch (e) {
    // 목록 조회 자체가 실패한 경우 — 부분 성공을 성공으로 위장하지 않는다.
    console.error('[crm/plaud-backfill POST]', e);
    return NextResponse.json({ error: '전사 일괄 처리에 실패했습니다.' }, { status: 500 });
  }
}
