#!/usr/bin/env node
/**
 * 상담 DB 내용을 분석해서 desired_subjects를 자동으로 채우는 스크립트
 * Usage: node scripts/infer-desired-subjects.mjs [--dry-run] [--limit N]
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

// ─── Config ──────────────────────────────────────────────────────────────────

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf-8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '9999');

const VALID_SUBJECTS = [
  'RW', 'Math', 'Both',
  'SSAT Math',
  'AP Calculus BC', 'AP US History', 'AP Physics 1', 'AP Biology',
  'AP Psychology', 'AP World History', 'AP Computer Science A',
  'AP Computer Science Principles', 'AP Macroeconomics', 'AP Microeconomics',
  'AP US Government and Politics', 'AP Comparative Government and Politics',
];

// ─── Main ────────────────────────────────────────────────────────────────────

const { data: students, error } = await supabase
  .from('students')
  .select('id, name, desired_subjects, consultation_timeline')
  .order('created_at', { ascending: false });

if (error) { console.error('DB 조회 실패:', error.message); process.exit(1); }

// 상담 내용이 있는 학생만 처리
const targets = students
  .filter(s => Array.isArray(s.consultation_timeline) && s.consultation_timeline.length > 0)
  .slice(0, LIMIT);

console.log(`\n전체: ${students.length}명 | 상담 기록 있음: ${targets.length}명\n`);

let updated = 0, skipped = 0, failed = 0;

for (const student of targets) {
  const memos = student.consultation_timeline
    .slice(-5) // 최근 5개만
    .map(e => e.ai_purified ?? e.raw_memo ?? '')
    .filter(Boolean)
    .join('\n---\n');

  if (!memos.trim()) { skipped++; continue; }

  let inferred;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      system: `다음 상담 메모를 읽고, 학생이 원하는 수업 과목을 아래 목록 중 하나만 골라 정확히 그 텍스트로만 답하세요. 모르면 "unknown"이라고만 답하세요.

유효한 값:
${VALID_SUBJECTS.join('\n')}`,
      messages: [{ role: 'user', content: `학생명: ${student.name}\n\n상담 내용:\n${memos}` }],
    });

    inferred = msg.content[0].type === 'text' ? msg.content[0].text.trim() : null;
  } catch (e) {
    console.error(`  ❌ ${student.name} — API 오류: ${e.message}`);
    failed++;
    continue;
  }

  const isValid = VALID_SUBJECTS.includes(inferred);
  const changed = isValid && inferred !== student.desired_subjects;

  const marker = !isValid ? '?' : changed ? '✓' : '=';
  console.log(`  ${marker} ${student.name.padEnd(16)} ${(student.desired_subjects ?? '(없음)').padEnd(20)} → ${inferred}`);

  if (changed && !DRY_RUN) {
    const { error: uErr } = await supabase
      .from('students')
      .update({ desired_subjects: inferred })
      .eq('id', student.id);

    if (uErr) {
      console.error(`    ⚠ 업데이트 실패: ${uErr.message}`);
      failed++;
    } else {
      updated++;
    }
  } else if (changed) {
    updated++; // dry-run에서 카운트만
  } else {
    skipped++;
  }
}

console.log(`\n완료 | 업데이트: ${updated}명 | 변경 없음/스킵: ${skipped}명 | 실패: ${failed}명`);
if (DRY_RUN) console.log('(--dry-run 모드: DB 변경 없음)');
