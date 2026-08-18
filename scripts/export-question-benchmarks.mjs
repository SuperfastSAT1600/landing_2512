/**
 * Export per-question accuracy benchmarks from SMS Diagnostic Test #1 results.
 *
 * Run:  node scripts/export-question-benchmarks.mjs
 * Out:  src/lib/report-benchmarks.ts  (overwrites mock data with real data)
 *
 * Reads from SMS Supabase (read-only, anon key).
 * No credentials needed for the landing app — output is a static TS file.
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── SMS Supabase (read-only) ──────────────────────────────────────────────────
const SMS_PROJECT_ID = 'fruombbyxfphuoqqhghd';
const SMS_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydW9tYmJ5eGZwaHVvcXFoZ2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MTk0NTYsImV4cCI6MjA4NzQ5NTQ1Nn0.j1zepugV04HjPp7DPhkhj_2KPDodDagspQ1XSi7qxBk';
const BASE = `https://${SMS_PROJECT_ID}.supabase.co/rest/v1`;

const H = {
  apikey: SMS_ANON_KEY,
  Authorization: `Bearer ${SMS_ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: H });
  if (!res.ok) throw new Error(`SMS API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching Diagnostic Test #1 from SMS...');

  // 1. Find the test (try both table names)
  const tests = await get(`/test?title=ilike.*Diagnostic Test*1*&select=id,title&limit=5`).catch(() =>
    get(`/tests?title=ilike.*Diagnostic Test*1*&select=id,title&limit=5`)
  );
  if (!tests.length) {
    console.error('No Diagnostic Test #1 found in SMS.');
    console.log('Available tests (first 10):');
    const all = await get(`/test?select=id,title&limit=10`).catch(() =>
      get(`/tests?select=id,title&limit=10`)
    );
    console.log(JSON.stringify(all, null, 2));
    process.exit(1);
  }
  return runWithTestId(tests[0]);
}

async function runWithTestId(test) {
  console.log(`Found: "${test.title}" (${test.id})`);

  // 2. Get all completed test_results for this test
  const results = await get(
    `/test_result?test_id=eq.${test.id}&status=eq.completed&select=id`
  ).catch(() =>
    get(`/test_results?test_id=eq.${test.id}&status=eq.completed&select=id`)
  );

  if (!results.length) {
    console.error('No completed results found for this test.');
    process.exit(1);
  }
  console.log(`Found ${results.length} completed results.`);

  const resultIds = results.map((r) => r.id);

  // 3. Fetch all answers for these results (batch by 50)
  const allAnswers = [];
  for (let i = 0; i < resultIds.length; i += 50) {
    const batch = resultIds.slice(i, i + 50);
    const rows = await get(
      `/test_answer?test_result_id=in.(${batch.join(',')})&select=question_id,is_correct,confidence_rate,time_spent`
    ).catch(() =>
      get(
        `/test_answers?test_result_id=in.(${batch.join(',')})&select=question_id,is_correct,confidence_rate,time_spent`
      )
    );
    allAnswers.push(...rows);
  }
  console.log(`Fetched ${allAnswers.length} total answers.`);

  // 4. Fetch question metadata (domain, subject/section) from test_questions
  // test_questions has id, domain, subject, skill, sort_order — no separate questions table needed
  const tqRows = await get(
    `/test_question?test_id=eq.${test.id}&select=id,domain,subject,skill,sort_order&order=sort_order.asc`
  ).catch(() =>
    get(
      `/test_questions?test_id=eq.${test.id}&select=id,domain,subject,skill,sort_order&order=sort_order.asc`
    )
  );

  const questionIds = tqRows.map((q) => q.id);
  const qMeta = {};
  for (const q of tqRows) qMeta[q.id] = q;

  // 5. Aggregate per-question
  const perQuestion = {}; // questionId → { correct, total, totalTime, totalConf }

  for (const a of allAnswers) {
    const qid = a.question_id;
    if (!perQuestion[qid]) {
      perQuestion[qid] = { correct: 0, total: 0, totalTime: 0, totalConf: 0, confCount: 0 };
    }
    const p = perQuestion[qid];
    p.total++;
    if (a.is_correct) p.correct++;
    if (a.time_spent) p.totalTime += a.time_spent;
    if (a.confidence_rate != null) { p.totalConf += a.confidence_rate; p.confCount++; }
  }

  // 6. Aggregate per-section and per-domain
  const perSection = {};
  const perDomain  = {};

  for (const qid of questionIds) {
    const meta = qMeta[qid];
    const stats = perQuestion[qid];
    if (!meta || !stats || stats.total === 0) continue;

    const section = meta.subject || 'Unknown';
    const domain  = meta.domain  || 'Unknown';

    if (!perSection[section]) perSection[section] = { correct: 0, total: 0, totalTime: 0, totalConf: 0, confCount: 0 };
    if (!perDomain[domain])   perDomain[domain]   = { correct: 0, total: 0 };

    perSection[section].correct    += stats.correct;
    perSection[section].total      += stats.total;
    perSection[section].totalTime  += stats.totalTime;
    perSection[section].totalConf  += stats.totalConf;
    perSection[section].confCount  += stats.confCount;

    perDomain[domain].correct += stats.correct;
    perDomain[domain].total   += stats.total;
  }

  // 7. Build output objects
  const questionBenchmarks = {};
  for (const [qid, stats] of Object.entries(perQuestion)) {
    if (stats.total === 0) continue;
    questionBenchmarks[qid] = {
      accuracy: Math.round((stats.correct / stats.total) * 1000) / 1000,
      avgTimeSeconds: stats.total > 0 ? Math.round(stats.totalTime / stats.total) : null,
      avgConfidence: stats.confCount > 0 ? Math.round((stats.totalConf / stats.confCount) * 10) / 10 : null,
      sampleSize: stats.total,
    };
  }

  const sectionBenchmarks = {};
  for (const [section, stats] of Object.entries(perSection)) {
    if (stats.total === 0) continue;
    sectionBenchmarks[section] = {
      globalAverage: {
        accuracy: Math.round((stats.correct / stats.total) * 1000) / 1000,
        avgTimeSeconds: stats.total > 0 ? Math.round(stats.totalTime / stats.total) : null,
        avgConfidence: stats.confCount > 0 ? Math.round((stats.totalConf / stats.confCount) * 10) / 10 : null,
      },
    };
  }

  const domainBenchmarks = {};
  for (const [domain, stats] of Object.entries(perDomain)) {
    if (stats.total === 0) continue;
    domainBenchmarks[domain] = {
      globalAverage: Math.round((stats.correct / stats.total) * 1000) / 1000,
    };
  }

  // 8. Write output
  const totalStudents = results.length;
  const exportedAt = new Date().toISOString();

  const ts = `/**
 * Real benchmark data exported from SMS Diagnostic Test #1.
 * Generated: ${exportedAt}
 * Sample size: ${totalStudents} students
 *
 * Re-generate: node scripts/export-question-benchmarks.mjs
 */

export interface BenchmarkTier {
  accuracy: number;         // 0–1
  avgTimeSeconds: number | null;
  avgConfidence: number | null;
}

export interface SectionBenchmarks {
  globalAverage: BenchmarkTier;
  top10?: BenchmarkTier;   // not yet computed — requires percentile ranking
}

export interface DomainBenchmark {
  globalAverage: number;   // accuracy 0–1
  top10?: number;
}

export interface QuestionBenchmark {
  accuracy: number;        // 0–1  correct / total
  avgTimeSeconds: number | null;
  avgConfidence: number | null;  // 0–100 percentage scale
  sampleSize: number;
}

/** Per-section aggregate accuracy across ${totalStudents} students */
export const SECTION_BENCHMARKS: Record<string, SectionBenchmarks> = ${JSON.stringify(sectionBenchmarks, null, 2)};

/** Per-domain aggregate accuracy across ${totalStudents} students */
export const DOMAIN_BENCHMARKS: Record<string, DomainBenchmark> = ${JSON.stringify(domainBenchmarks, null, 2)};

/** Per-question accuracy (by question UUID) across ${totalStudents} students */
export const QUESTION_BENCHMARKS: Record<string, QuestionBenchmark> = ${JSON.stringify(questionBenchmarks, null, 2)};

/** Metadata */
export const BENCHMARK_META = {
  sampleSize: ${totalStudents},
  exportedAt: '${exportedAt}',
  testTitle: '${test.title}',
};
`;

  const outPath = join(__dirname, '..', 'src', 'lib', 'report-benchmarks.ts');
  writeFileSync(outPath, ts);

  console.log(`\n✓ Written to: ${outPath}`);
  console.log(`  Students:  ${totalStudents}`);
  console.log(`  Questions: ${Object.keys(questionBenchmarks).length}`);
  console.log(`  Sections:  ${Object.keys(sectionBenchmarks).join(', ')}`);
  console.log(`  Domains:   ${Object.keys(domainBenchmarks).length}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
