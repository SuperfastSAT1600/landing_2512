/**
 * 진단테스트 응시 → 결제 전환 리포트 — READ ONLY.
 *
 *   npx tsx scripts/legacy-diagnostic-report.ts [--from 2025-06-01] [--to 2025-09-30]
 *
 * 전환 정의는 src/lib/legacy-diagnostic-conversion.ts (= crm-stats-service 코호트 정의)를 따른다.
 * 이름만으로 매칭한 데이터라 전환율을 한 숫자로 내지 않는다 — 상·하한과 미매칭 비율을 같이 낸다.
 */
import { writeFileSync, mkdirSync } from 'fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadEnv, client, fetchAllStudents } from './crm-fetch';
import { isUnscoredLegacy } from '../src/lib/legacy-diagnostic-normalize';
import {
  computeLegacyConversion,
  type AttemptForStats,
  type PaymentRow,
  type LeadRow,
} from '../src/lib/legacy-diagnostic-conversion';

const OUT_DIR = 'scripts/out/legacy-diagnostic';
const PAGE = 500;

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

async function fetchAllPayments(sb: SupabaseClient): Promise<PaymentRow[]> {
  const rows: PaymentRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('payments')
      .select('student_id, student_name, paid_at, amount, payment_type')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`payments 조회 실패: ${error.message}`);
    if (!data?.length) break;
    rows.push(...(data as PaymentRow[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

async function main(): Promise<void> {
  loadEnv();
  const sb = client();
  mkdirSync(OUT_DIR, { recursive: true });

  const from = arg('--from', '2025-06-01');
  const to = arg('--to', '2025-09-30');

  const { data: attemptRows, error } = await sb
    .from('legacy_diagnostic_results')
    .select('id, student_id, student_name, score, rw_score, math_score, taken_at, is_internal')
    .order('taken_at');
  if (error) throw new Error(`legacy_diagnostic_results 조회 실패: ${error.message}`);

  const attempts: AttemptForStats[] = (attemptRows ?? []).map((r) => ({
    record_id: r.id as string,
    student_id: (r.student_id as string | null) ?? null,
    student_name: (r.student_name as string) ?? '',
    score: (r.score as number | null) ?? null,
    taken_at: (r.taken_at as string | null) ?? null,
    is_internal: !!r.is_internal,
    unscored: isUnscoredLegacy({
      score: (r.score as number | null) ?? null,
      rw_score: (r.rw_score as number | null) ?? null,
      math_score: (r.math_score as number | null) ?? null,
    }),
  }));

  const [payments, leads] = await Promise.all([
    fetchAllPayments(sb),
    fetchAllStudents<LeadRow>(sb, 'id, name, inquiry_date'),
  ]);

  const rep = computeLegacyConversion(attempts, payments, leads, { from, to });

  const lines = [
    `# 진단테스트(2025) 응시 → 결제 전환 리포트`,
    ``,
    `- 대상 기간(기준선 코호트): ${from} ~ ${to}`,
    `- 응시자(내부 제출 제외, 학생당 최초 1건): **${rep.totalAttempts}명**`,
    `- CRM 매칭: ${rep.matched}명 (${pct(rep.matchRate)}) / 미매칭 ${rep.unmatched}명`,
    ``,
    `## 전환율`,
    ``,
    `| 기준 | 값 | 비고 |`,
    `|---|---|---|`,
    `| 결제 전환 인원 | ${rep.converted}명 | 최초결제(환불 제외) |`,
    `| 매칭분 기준 (상한) | ${pct(rep.conversionRateMatched)} | 이름이 CRM과 이어진 ${rep.matched}명 중 |`,
    `| 전체 응시자 기준 (하한) | ${pct(rep.conversionRateAll)} | 미매칭 ${rep.unmatched}명을 전부 미전환으로 가정 |`,
    `| **기준선**: 같은 기간 전체 리드 | ${pct(rep.baseline.rate)} | ${rep.baseline.converted}/${rep.baseline.leads}명 |`,
    ``,
    `## 점수대별 (매칭분)`,
    ``,
    `| 점수대 | 응시 | 결제 | 전환율 |`,
    `|---|---|---|---|`,
    ...rep.byScoreBand.map((b) => `| ${b.band} | ${b.attempts} | ${b.converted} | ${pct(b.rate)} |`),
    ``,
    `## 응시 → 최초결제 소요일`,
    ``,
    `- 표본 ${rep.daysToPayment.n}명 · 중앙값 ${rep.daysToPayment.median ?? '-'}일 · 평균 ${rep.daysToPayment.mean ?? '-'}일`,
    ``,
    `> 매칭 키가 이름뿐이라(옛 폼이 전화·이메일을 받지 않았다) 미매칭이 남는다.`,
    `> 실제 전환율은 상한과 하한 사이에 있다.`,
  ];

  const md = lines.join('\n');
  console.log(md);
  writeFileSync(`${OUT_DIR}/conversion-report.md`, md, 'utf-8');
  writeFileSync(`${OUT_DIR}/conversion-report.json`, JSON.stringify(rep, null, 2), 'utf-8');
  console.log(`\n→ ${OUT_DIR}/conversion-report.md`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
