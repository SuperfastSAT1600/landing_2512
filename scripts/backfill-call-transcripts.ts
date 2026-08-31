/**
 * 이미 만들어진 Plaud 상담 메모에서 전사를 되찾아 call_transcripts에 채운다 (REQ-006).
 *
 * 라우트가 전사를 버려온 탓에 지난 녹음들의 전사가 DB에 없다. Plaud 녹음에는 학생
 * 참조가 없으므로, 복구는 메모 헤더(`🎙️ Plaud 상담 자동 요약 · 이름 · 시각`)를 파싱해
 * Plaud 녹음 목록과 다시 맞추는 방식으로만 가능하다. 메모가 된 적 없는 녹음은 대상이 아니다.
 *
 * 비용: 매칭 1건당 Qwen ASR 1회(21분 파일 기준 ~22s). 첫 실행은 반드시 --limit으로 묶을 것.
 * 재실행 안전: (source, external_id) 유니크 + 기존 transcript 조회로 이미 넣은 건은 건너뛴다.
 *
 * 실행:
 *   npx tsx scripts/backfill-call-transcripts.ts --dry-run
 *   npx tsx scripts/backfill-call-transcripts.ts --limit 3
 *   npx tsx scripts/backfill-call-transcripts.ts --account wooyoung
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { runBackfill, type BackfillDeps, type StudentTimeline } from '../src/lib/plaud-backfill-run';
import { getPlaudFile, listPlaudRecordings, PLAUD_ACCOUNTS } from '../src/lib/plaud-client';
import { transcribeAudioUrl } from '../src/lib/plaud-transcribe';
import { insertCallTranscript } from '../src/lib/call-transcripts';
import { ASR_MODEL } from '../src/lib/qwen-asr';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const FETCH_PAGE = 500; // Supabase 1000행 캡 회피
const RECORDING_PAGE_SIZE = 100;
const MAX_RECORDING_PAGES = 20;

interface Options {
  dryRun: boolean;
  limit: number | null;
  accounts: string[];
}

function parseArgs(argv: string[]): Options {
  const flag = (name: string) => argv.includes(`--${name}`);
  const value = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const account = value('account');
  if (account && !PLAUD_ACCOUNTS.some((a) => a.key === account)) {
    throw new Error(`알 수 없는 계정: ${account} (가능: ${PLAUD_ACCOUNTS.map((a) => a.key).join(', ')})`);
  }
  const limitRaw = value('limit');
  return {
    dryRun: flag('dry-run'),
    limit: limitRaw ? Number(limitRaw) : null,
    accounts: account ? [account] : PLAUD_ACCOUNTS.map((a) => a.key),
  };
}

/** 학생 타임라인 전량을 페이지 단위로 읽는다. 후보 선별은 runBackfill이 한다. */
async function fetchStudents(db: SupabaseClient): Promise<StudentTimeline[]> {
  const rows: StudentTimeline[] = [];
  for (let from = 0; ; from += FETCH_PAGE) {
    const { data, error } = await db
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
async function fetchCapturedEntryIds(db: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let from = 0; ; from += FETCH_PAGE) {
    const { data, error } = await db
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

/** 계정의 녹음을 페이지 끝까지 모은다. 오래된 메모까지 맞추려면 전량이 필요하다. */
async function fetchAllRecordings(accountKey: string) {
  const all = [];
  for (let page = 1; page <= MAX_RECORDING_PAGES; page++) {
    const batch = await listPlaudRecordings({ page, page_size: RECORDING_PAGE_SIZE }, accountKey);
    all.push(...batch);
    if (batch.length < RECORDING_PAGE_SIZE) break;
  }
  return all;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const deps: BackfillDeps = {
    listStudents: () => fetchStudents(db),
    listCapturedEntryIds: () => fetchCapturedEntryIds(db),
    listRecordings: fetchAllRecordings,
    getFile: getPlaudFile,
    transcribe: transcribeAudioUrl,
    insert: insertCallTranscript,
    log: (m) => console.log(`  ${m}`),
  };

  console.log(
    `백필 시작 (accounts=${opts.accounts.join(',')}, limit=${opts.limit ?? '-'}, dryRun=${opts.dryRun})`
  );

  const r = await runBackfill(deps, {
    dryRun: opts.dryRun,
    ...(opts.limit !== null ? { limit: opts.limit } : {}),
    accounts: opts.accounts,
    asrModel: ASR_MODEL,
  });

  console.log(
    `\n대상 ${r.candidates}건 | 저장 ${r.inserted} | ${opts.dryRun ? `저장예정 ${r.wouldInsert} | ` : ''}` +
      `이미보유 ${r.skipped} | 미매칭 ${r.unmatched} | 모호 ${r.ambiguous} | 실패 ${r.failed} | 남음 ${r.remaining}`
  );

  const dump = (title: string, rows: { studentId: string; entryId: string; recordingName: string; reason: string }[]) => {
    if (!rows.length) return;
    console.log(`\n${title}`);
    for (const e of rows) console.log(`  ${e.studentId} / ${e.entryId} · "${e.recordingName}" — ${e.reason}`);
  };
  dump('미매칭 (녹음을 찾지 못함):', r.unmatchedEntries);
  dump('모호 (후보 복수 — 추측하지 않음):', r.ambiguousEntries);
  dump('실패:', r.failedEntries);

  // 남은 건이 있으면 재실행으로 이어서 처리하면 된다(이미 넣은 건은 자동 제외).
  process.exit(r.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
