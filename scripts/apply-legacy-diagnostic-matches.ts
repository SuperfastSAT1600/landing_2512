/**
 * 수검토 시트(review-candidates.xlsx)의 확정 열을 legacy_diagnostic_results 에 반영한다.
 *
 *   npx tsx scripts/apply-legacy-diagnostic-matches.ts [--file <path>] [--dry-run]
 *
 * 사람이 채우는 열은 셋뿐이다:
 *   confirm_student_id   — 이 응시가 누구인지 (CRM students.id)
 *   confirm_is_internal  — 사내 테스트/장난 제출이면 y
 *   confirm_no_match     — CRM 후보와 동일인이 아니면 y (다시 묻지 않기 위해 기록)
 * 검증에 걸린 행은 반영하지 않고 목록으로 출력한다. 조용히 넘어가면 통계가 틀어진다.
 */
import * as XLSX from 'xlsx';
import { loadEnv, client, fetchAllStudents } from './crm-fetch';
import { validateManualMatches } from '../src/lib/legacy-diagnostic-match';

const DEFAULT_FILE = 'scripts/out/legacy-diagnostic/review-candidates.xlsx';
const DRY = process.argv.includes('--dry-run');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  loadEnv();
  const sb = client();

  const file = arg('--file') ?? DEFAULT_FILE;
  const wb = XLSX.readFile(file);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false });
  console.log(`${file} — ${rows.length}행`);

  const students = await fetchAllStudents<{ id: string }>(sb, 'id');
  const validIds = new Set(students.map((s) => s.id));

  const { updates, errors } = validateManualMatches(rows, validIds);
  console.log(`반영 대상 ${updates.length}건 / 검증 실패 ${errors.length}건`);
  for (const e of errors) console.error(`  ! ${e}`);

  if (DRY) {
    console.log('(--dry-run: DB에 쓰지 않았다)');
    return;
  }

  let applied = 0;
  for (const u of updates) {
    const patch: Record<string, unknown> = { is_internal: u.is_internal, updated_at: new Date().toISOString() };
    if (u.student_id) {
      patch.student_id = u.student_id;
      patch.match_method = 'manual';
      patch.match_confidence = 'high';
      patch.match_note = '수검토 확정';
    } else if (u.no_match) {
      // 판정 자체를 기록해 둔다 — 안 그러면 다음 실행에서 같은 건을 또 물어보게 된다.
      patch.student_id = null;
      patch.match_method = 'manual';
      patch.match_confidence = null;
      patch.match_note = '수검토 확인 — 동일인 아님';
    }
    const { error } = await sb.from('legacy_diagnostic_results').update(patch).eq('id', u.record_id);
    if (error) {
      console.error(`  ! 반영 실패 ${u.record_id}: ${error.message}`);
      continue;
    }
    applied++;
  }
  console.log(`반영 완료 ${applied}건`);
  if (errors.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
