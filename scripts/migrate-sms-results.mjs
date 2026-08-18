/**
 * Migrate SMS Diagnostic Test #1 results (76 students) into Landing App Supabase.
 *
 * Run:  node scripts/migrate-sms-results.mjs
 *       node scripts/migrate-sms-results.mjs --dry-run   (preview only, no writes)
 *       node scripts/migrate-sms-results.mjs --rollback  (delete migrated rows)
 *
 * Strategy:
 *  - answers JSONB: correct option ID if is_correct=true, "_wrong_" otherwise
 *    (accurate enough for accuracy/confidence/time stats; answerDistribution won't reflect real choices)
 *  - confidence_levels: from SMS confidence_rate (0/25/50/75/100 scale, same scale)
 *  - question_times: from SMS time_spent (seconds)
 *  - student_email: "sms_NNN@benchmark.internal" (synthetic, for dedup/rollback)
 *  - student_name: "" (empty — not needed)
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ───────────────────────────────────────────────────────────────────
const SMS_PROJECT_ID = 'fruombbyxfphuoqqhghd';
const SMS_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydW9tYmJ5eGZwaHVvcXFoZ2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MTk0NTYsImV4cCI6MjA4NzQ5NTQ1Nn0.j1zepugV04HjPp7DPhkhj_2KPDodDagspQ1XSi7qxBk';
const SMS_BASE = `https://${SMS_PROJECT_ID}.supabase.co/rest/v1`;

const LANDING_URL = 'https://ualucbrrfvysmfytkdew.supabase.co';
const LANDING_SERVICE_KEY = 'sb_secret_Fw8dv9bMP5CMMYxWhhzsaQ_0DUeEMdP';

const DRY_RUN = process.argv.includes('--dry-run');
const ROLLBACK = process.argv.includes('--rollback');
const MARKER = '@benchmark.internal'; // email suffix used to identify migrated rows

// ── SMS helpers ──────────────────────────────────────────────────────────────
const SMS_H = {
  apikey: SMS_ANON_KEY,
  Authorization: `Bearer ${SMS_ANON_KEY}`,
};

async function smsGet(path) {
  const res = await fetch(`${SMS_BASE}${path}`, { headers: SMS_H });
  if (!res.ok) throw new Error(`SMS API ${res.status} ${path}: ${await res.text()}`);
  return res.json();
}

// ── Main ─────────────────────────────────────────────────────────────────────
const landing = createClient(LANDING_URL, LANDING_SERVICE_KEY);

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no writes' : ROLLBACK ? '🗑️  ROLLBACK mode' : '🚀 MIGRATE mode');

  // ── Rollback ─────────────────────────────────────────────────────────────
  if (ROLLBACK) {
    const { data, error } = await landing
      .from('diagnostic_test_results')
      .delete()
      .like('student_email', `%${MARKER}`)
      .select('id');
    if (error) throw error;
    console.log(`✓ Deleted ${data.length} migrated rows.`);
    return;
  }

  // ── Step 1: Get Landing App current test version ──────────────────────────
  console.log('\n[1/6] Fetching Landing App current test version...');
  const { data: version, error: vErr } = await landing
    .from('diagnostic_test_versions')
    .select('id, version_number, questions')
    .eq('is_current', true)
    .single();
  if (vErr || !version) throw new Error('No current test version found in Landing App.');
  console.log(`  → Version ${version.version_number} (${version.id}), ${version.questions.length} questions`);

  // Build correctAnswerMap: { questionId → correctAnswerId/text }
  const correctAnswerMap = {};
  for (const q of version.questions) {
    if (q.type === 'multiple-choice') {
      const correct = q.options?.find((o) => o.type === 'correct');
      correctAnswerMap[q.id] = correct?.id ?? null;
    } else {
      correctAnswerMap[q.id] = q.answers?.[0] ?? null;
    }
  }

  // ── Step 2: Find SMS test ────────────────────────────────────────────────
  console.log('\n[2/6] Finding SMS Diagnostic Test #1...');
  const tests = await smsGet(`/test?title=ilike.*Diagnostic Test*1*&select=id,title&limit=5`).catch(() =>
    smsGet(`/tests?title=ilike.*Diagnostic Test*1*&select=id,title&limit=5`)
  );
  if (!tests.length) throw new Error('No Diagnostic Test #1 found in SMS.');
  const test = tests[0];
  console.log(`  → "${test.title}" (${test.id})`);

  // ── Step 3: Fetch SMS completed results ──────────────────────────────────
  console.log('\n[3/6] Fetching SMS completed results...');
  const results = await smsGet(
    `/test_result?test_id=eq.${test.id}&status=eq.completed&select=id,created_at`
  ).catch(() =>
    smsGet(`/test_results?test_id=eq.${test.id}&status=eq.completed&select=id,created_at`)
  );
  console.log(`  → ${results.length} completed results`);

  // ── Step 4: Check for already-migrated rows ───────────────────────────────
  console.log('\n[4/6] Checking for existing migrated rows...');
  const { data: existing } = await landing
    .from('diagnostic_test_results')
    .select('student_email')
    .like('student_email', `%${MARKER}`);
  const existingEmails = new Set((existing ?? []).map((r) => r.student_email));
  console.log(`  → ${existingEmails.size} rows already migrated`);

  // ── Step 5: Fetch SMS answers (batched) ──────────────────────────────────
  console.log('\n[5/6] Fetching SMS answers...');
  const resultIds = results.map((r) => r.id);
  const answersByResult = {}; // resultId → { qId: { is_correct, confidence_rate, time_spent } }

  for (let i = 0; i < resultIds.length; i += 50) {
    const batch = resultIds.slice(i, i + 50);
    const rows = await smsGet(
      `/test_answers?test_result_id=in.(${batch.join(',')})&select=test_result_id,question_id,is_correct,confidence_rate,time_spent`
    );
    for (const row of rows) {
      if (!answersByResult[row.test_result_id]) answersByResult[row.test_result_id] = {};
      answersByResult[row.test_result_id][row.question_id] = {
        is_correct: row.is_correct,
        confidence_rate: row.confidence_rate,
        time_spent: row.time_spent,
      };
    }
    process.stdout.write(`  → ${Math.min(i + 50, resultIds.length)}/${resultIds.length} results fetched\r`);
  }
  console.log(`\n  → Fetched answers for ${Object.keys(answersByResult).length} results`);

  // ── Step 6: Build and insert rows ────────────────────────────────────────
  console.log('\n[6/6] Building rows...');
  const toInsert = [];
  let skipped = 0;

  results.forEach((result, idx) => {
    const email = `sms_${String(idx + 1).padStart(3, '0')}${MARKER}`;
    if (existingEmails.has(email)) { skipped++; return; }

    const studentAnswers = answersByResult[result.id] ?? {};
    const answers = {};
    const confidence_levels = {};
    const question_times = {};

    for (const [qId, a] of Object.entries(studentAnswers)) {
      // Use correct answer ID if correct, otherwise "_wrong_" placeholder
      if (a.is_correct) {
        answers[qId] = correctAnswerMap[qId] ?? '_correct_unknown_';
      } else {
        answers[qId] = '_wrong_';
      }
      if (a.confidence_rate != null) confidence_levels[qId] = a.confidence_rate;
      if (a.time_spent != null) question_times[qId] = a.time_spent;
    }

    toInsert.push({
      student_email: email,
      student_name: '',
      test_id: test.id,
      test_version_id: version.id,
      submitted_at: result.created_at,
      answers,
      confidence_levels,
      question_times,
      flagged_questions: [],
      saved_words: [],
    });
  });

  console.log(`  → ${toInsert.length} rows to insert, ${skipped} already exist`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Sample row:');
    const sample = toInsert[0];
    if (sample) {
      const qCount = Object.keys(sample.answers).length;
      const correctCount = Object.values(sample.answers).filter((v) => v !== '_wrong_').length;
      console.log(`  email: ${sample.student_email}`);
      console.log(`  questions answered: ${qCount}, correct: ${correctCount}`);
      console.log(`  confidence keys: ${Object.keys(sample.confidence_levels).length}`);
      console.log(`  time keys: ${Object.keys(sample.question_times).length}`);
    }
    console.log('\n✓ Dry run complete. Run without --dry-run to write.');
    return;
  }

  if (toInsert.length === 0) {
    console.log('\n✓ Nothing to insert. All rows already migrated.');
    return;
  }

  // Insert in batches of 20
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 20) {
    const batch = toInsert.slice(i, i + 20);
    const { error } = await landing.from('diagnostic_test_results').insert(batch);
    if (error) throw new Error(`Insert failed at batch ${i}: ${error.message}`);
    inserted += batch.length;
    process.stdout.write(`  → Inserted ${inserted}/${toInsert.length}\r`);
  }

  console.log(`\n\n✓ Done! Migrated ${inserted} SMS results into Landing App.`);
  console.log(`  test_version_id: ${version.id}`);
  console.log(`  To rollback: node scripts/migrate-sms-results.mjs --rollback`);
}

main().catch((err) => {
  console.error('\n✗ Error:', err.message);
  process.exit(1);
});
