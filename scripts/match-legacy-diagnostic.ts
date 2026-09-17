/**
 * 레거시 진단테스트 기록 적재 + CRM 학생 자동매칭.
 *
 *   npx tsx scripts/export-legacy-diagnostic.ts   (선행: normalized.json 생성)
 *   npx tsx scripts/match-legacy-diagnostic.ts [--dry-run] [--offline]
 *
 * --offline 은 DB 테이블 없이(마이그레이션 전에도) normalized.json 을 CRM 학생과 대조해
 * 매칭 결과만 출력한다. 적재 전에 매칭 품질을 눈으로 확인하는 용도다.
 *
 * 쓰기는 legacy_diagnostic_results 한 테이블로 한정한다. students/payments 는 읽기만 한다.
 * 자동확정은 auto_exact(high) 만 DB에 쓰고, 그 외(중간확신·미확정)는 수검토 시트로 넘긴다.
 * upsert 페이로드에 match_* 를 넣지 않으므로 재실행해도 사람이 확정한 값은 살아남는다.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import * as XLSX from 'xlsx';
import { loadEnv, client, fetchAllStudents } from './crm-fetch';
import { toUpsertRow, type NormalizedAttempt } from '../src/lib/legacy-diagnostic-normalize';
import {
  buildStudentIndex,
  matchAttempt,
  buildReviewRows,
  type StudentRow,
  type MatchOutcome,
} from '../src/lib/legacy-diagnostic-match';

const OUT_DIR = 'scripts/out/legacy-diagnostic';
const NORMALIZED = `${OUT_DIR}/normalized.json`;
const CHUNK = 200;
const DRY = process.argv.includes('--dry-run');
const OFFLINE = process.argv.includes('--offline');

interface StoredRecord {
  id: string;
  firebase_key: string | null;
  original_id: string | null;
  student_name: string;
  student_grade: string | null;
  score: number | null;
  taken_at: string | null;
  is_internal: boolean;
  student_id: string | null;
  match_method: string | null;
}

async function main(): Promise<void> {
  loadEnv();
  const sb = client();
  mkdirSync(OUT_DIR, { recursive: true });

  const attempts: NormalizedAttempt[] = JSON.parse(readFileSync(NORMALIZED, 'utf-8'));
  console.log(`정규화 레코드 ${attempts.length}건`);

  if (OFFLINE) {
    const students = await fetchAllStudents<StudentRow>(sb, 'id, name, grade, inquiry_date');
    const index = buildStudentIndex(students);
    console.log(`CRM 학생 ${students.length}명 인덱싱 — 적재 없이 매칭만 확인한다\n`);
    for (const a of attempts.filter((x) => !x.is_internal)) {
      const o = matchAttempt(
        {
          id: a.original_id ?? a.firebase_key ?? '?',
          student_name: a.student_name,
          student_grade: a.student_grade,
          taken_at: a.taken_at,
        },
        index
      );
      const cand = o.candidates
        .map((c) => `${c.name}(${c.grade ?? '-'},${(c.inquiry_date ?? '-').slice(0, 10)})`)
        .join(', ');
      console.log(
        `${a.student_name.padEnd(10)} ${(a.student_grade ?? '-').padEnd(6)} ${(a.taken_at ?? '').slice(0, 10)} → ` +
          `${o.student_id ?? '미매칭'} [${o.match_method ?? '-'}/${o.match_confidence ?? '-'}] ${o.match_note}` +
          (cand ? `  후보: ${cand}` : '')
      );
    }
    return;
  }

  // 1) 적재 — 자연키가 소스마다 다르고(firebase_key / original_id) 두 유니크 인덱스가
  // 부분 인덱스라 PostgREST 의 onConflict 를 쓸 수 없다(ON CONFLICT 는 부분 인덱스를
  // arbiter 로 받지 못한다). 그래서 기존 키를 먼저 읽어 신규만 insert, 기존은 update 한다.
  if (!DRY) {
    const { data: existingRows, error: existErr } = await sb
      .from('legacy_diagnostic_results')
      .select('id, firebase_key, original_id');
    if (existErr) throw new Error(`기존 적재분 조회 실패: ${existErr.message}`);

    const idByFirebaseKey = new Map<string, string>();
    const idByOriginalId = new Map<string, string>();
    for (const r of (existingRows ?? []) as Array<{ id: string; firebase_key: string | null; original_id: string | null }>) {
      if (r.firebase_key) idByFirebaseKey.set(r.firebase_key, r.id);
      if (r.original_id) idByOriginalId.set(r.original_id, r.id);
    }

    const toInsert: Array<Record<string, unknown>> = [];
    let updated = 0;
    for (const a of attempts) {
      if (!a.firebase_key && !a.original_id) continue; // 자연키 없는 레코드는 중복 방지가 불가
      const existingId =
        (a.firebase_key && idByFirebaseKey.get(a.firebase_key)) ||
        (a.original_id && idByOriginalId.get(a.original_id)) ||
        null;
      const row = toUpsertRow(a);
      if (existingId) {
        // match_* 는 페이로드에 없다 — 재적재가 수검토 확정을 덮지 않는다.
        const { error } = await sb.from('legacy_diagnostic_results').update(row).eq('id', existingId);
        if (error) throw new Error(`갱신 실패(${existingId}): ${error.message}`);
        updated++;
      } else {
        toInsert.push(row);
      }
    }
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const { error } = await sb.from('legacy_diagnostic_results').insert(toInsert.slice(i, i + CHUNK));
      if (error) throw new Error(`적재 실패: ${error.message}`);
    }
    console.log(`적재 완료 — 신규 ${toInsert.length}건 / 갱신 ${updated}건`);
    const orphan = attempts.filter((a) => !a.firebase_key && !a.original_id).length;
    if (orphan) console.warn(`  ! 자연키 없는 레코드 ${orphan}건은 중복 방지가 불가해 적재하지 않았다`);
  }

  // 2) 적재된 행을 id 포함해 다시 읽는다 (수검토 시트의 record_id = DB id)
  const { data: stored, error: readErr } = await sb
    .from('legacy_diagnostic_results')
    .select('id, firebase_key, original_id, student_name, student_grade, score, taken_at, is_internal, student_id, match_method')
    .order('taken_at');
  if (readErr) throw new Error(`적재분 조회 실패: ${readErr.message}`);
  const records = (stored ?? []) as StoredRecord[];
  const targets = records.filter((r) => !r.is_internal);
  console.log(`적재분 ${records.length}건 (내부 테스트 제외 ${targets.length}건)`);

  // 3) 후보 학생 — 전수를 본다. 동명이인은 좁히지 못하면 어차피 수검토로 넘어간다.
  const students = await fetchAllStudents<StudentRow>(sb, 'id, name, grade, inquiry_date');
  const index = buildStudentIndex(students);
  console.log(`CRM 학생 ${students.length}명 인덱싱`);

  // 4) 매칭
  const outcomes = new Map<string, MatchOutcome>();
  for (const r of targets) {
    outcomes.set(
      r.id,
      matchAttempt(
        { id: r.id, student_name: r.student_name, student_grade: r.student_grade, taken_at: r.taken_at },
        index
      )
    );
  }

  const auto = targets.filter((r) => {
    const o = outcomes.get(r.id)!;
    return o.match_confidence === 'high' && r.match_method !== 'manual';
  });
  // 사람이 이미 판정한 건(확정이든 '동일인 아님'이든)은 다시 묻지 않는다.
  const review = targets.filter((r) => !auto.includes(r) && r.match_method !== 'manual');

  if (!DRY) {
    for (const r of auto) {
      const o = outcomes.get(r.id)!;
      const { error } = await sb
        .from('legacy_diagnostic_results')
        .update({
          student_id: o.student_id,
          match_method: o.match_method,
          match_confidence: o.match_confidence,
          match_note: o.match_note,
          updated_at: new Date().toISOString(),
        })
        .eq('id', r.id);
      if (error) throw new Error(`매칭 반영 실패(${r.id}): ${error.message}`);
    }
  }
  console.log(`자동확정 ${auto.length}건 / 수검토 대상 ${review.length}건`);

  // 5) 수검토 시트 — confirm_student_id, confirm_is_internal 두 열만 채워 돌려주면 된다.
  const rows = buildReviewRows(
    review.map((r) => ({
      attempt: { id: r.id, student_name: r.student_name, student_grade: r.student_grade, taken_at: r.taken_at },
      score: r.score,
      outcome: outcomes.get(r.id)!,
    }))
  );
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'review');
  XLSX.writeFile(wb, `${OUT_DIR}/review-candidates.xlsx`);
  // 엑셀이 없어도 열 수 있게 CSV 도 같이 낸다(Numbers·구글시트·텍스트편집기).
  // BOM 을 붙여야 한글이 깨지지 않는다.
  writeFileSync(`${OUT_DIR}/review-candidates.csv`, '\uFEFF' + XLSX.utils.sheet_to_csv(sheet), 'utf-8');
  writeFileSync(`${OUT_DIR}/review-candidates.json`, JSON.stringify(rows, null, 2));
  console.log(`수검토 시트 → ${OUT_DIR}/review-candidates.{xlsx,csv}`);
  if (DRY) console.log('(--dry-run: DB에 아무것도 쓰지 않았다)');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
