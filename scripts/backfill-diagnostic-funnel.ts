/**
 * 진단테스트 응시 완료 → CRM 퍼널 반영 백필.
 *
 *   npx tsx scripts/backfill-diagnostic-funnel.ts            # 계획만 출력 (기본, 쓰지 않음)
 *   npx tsx scripts/backfill-diagnostic-funnel.ts --apply    # students.diagnostic_funnel_stage 갱신
 *
 * 판정 로직은 src/lib/diagnostic-backfill.ts (순수 함수, 테스트 있음).
 * 쓰기 전에 되돌릴 수 있도록 이전 단계값을 rollback 파일로 남긴다.
 * 매칭이 갈리는 건(동명이인·CRM 미등록)은 절대 추정하지 않고 수기 확인 시트로 뺀다.
 */
import { writeFileSync, mkdirSync } from 'fs';
import * as XLSX from 'xlsx';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadEnv, client, fetchAllStudents } from './crm-fetch';
import {
  planFunnelBackfill,
  DIAGNOSTIC_DONE_STAGE,
  type BackfillResult,
  type BackfillStudent,
  type BackfillToken,
} from '../src/lib/diagnostic-backfill';

const OUT_DIR = 'scripts/out/diag-backfill';
const PAGE = 500;
const APPLY = process.argv.includes('--apply');

async function all<T>(sb: SupabaseClient, table: string, cols: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select(cols).order('id').range(from, from + PAGE - 1);
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`);
    if (!data?.length) break;
    rows.push(...(data as unknown as T[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

async function main(): Promise<void> {
  loadEnv();
  const sb = client();
  mkdirSync(OUT_DIR, { recursive: true });

  const [results, tokens, students] = await Promise.all([
    all<BackfillResult>(sb, 'diagnostic_test_results', 'id, token_id, student_id, student_name, submitted_at, test_id'),
    all<BackfillToken>(sb, 'diagnostic_access_tokens', 'id, student_name, phone_number, student_id'),
    fetchAllStudents<BackfillStudent>(sb, 'id, name, parent_phone, diagnostic_funnel_stage'),
  ]);
  console.log(`진단 결과 ${results.length}건 · 토큰 ${tokens.length}건 · CRM 학생 ${students.length}명`);

  const plan = planFunnelBackfill(results, tokens, students);
  const byHow = plan.updates.reduce<Record<string, number>>((a, u) => ({ ...a, [u.how]: (a[u.how] ?? 0) + 1 }), {});

  console.log(`\n이미 퍼널 4·5로 반영됨: ${plan.alreadyDone}명`);
  console.log(`>> 갱신 대상: ${plan.updates.length}명 → 퍼널 ${DIAGNOSTIC_DONE_STAGE}`);
  console.log(`   매칭 근거: ${Object.entries(byHow).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`수기 확인 필요: ${plan.manual.length}건`);
  console.log(`이름 없는 제출물(시드/데모, 무시): ${plan.unnamed}건`);

  writeFileSync(`${OUT_DIR}/plan.json`, JSON.stringify(plan, null, 2));

  const manualSheet = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    manualSheet,
    XLSX.utils.json_to_sheet(
      plan.manual.map((m) => ({
        result_id: m.result_id,
        name: m.name,
        submitted_at: (m.submitted_at ?? '').slice(0, 10),
        사유: m.how,
        후보: m.candidates.join('  //  '),
        confirm_student_id: '',
        memo: '',
      }))
    ),
    'manual'
  );
  XLSX.writeFile(manualSheet, `${OUT_DIR}/manual-check.xlsx`);
  console.log(`\n수기 확인 시트 → ${OUT_DIR}/manual-check.xlsx`);

  if (!APPLY) {
    console.log('\n(계획만 출력했다. 반영하려면 --apply)');
    return;
  }

  // 되돌리기용 스냅샷을 먼저 남긴다 — 쓰고 나서 만들면 의미가 없다.
  const rollbackPath = `${OUT_DIR}/rollback.json`;
  writeFileSync(rollbackPath, JSON.stringify(plan.updates.map((u) => ({ student_id: u.student_id, name: u.name, diagnostic_funnel_stage: u.from })), null, 2));
  console.log(`\n롤백 스냅샷 → ${rollbackPath}`);

  let applied = 0;
  for (const u of plan.updates) {
    const { error } = await sb
      .from('students')
      .update({ diagnostic_funnel_stage: u.to })
      .eq('id', u.student_id);
    if (error) {
      console.error(`  ! 실패 ${u.name}(${u.student_id}): ${error.message}`);
      continue;
    }
    applied++;
  }
  console.log(`반영 완료 ${applied}/${plan.updates.length}명`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
