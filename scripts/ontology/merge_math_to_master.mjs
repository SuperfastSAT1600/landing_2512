#!/usr/bin/env node
/**
 * Math QB 추출 결과를 master_sat_ontology_v2.jsonl 스키마로 정규화 후 통합.
 *
 * 매핑:
 *   metadata.question_id  → id
 *   "SAT"                 → test
 *   "Math"                → section (analysis에 포함)
 *   metadata.domain       → domain  (Algebra / Advanced Math / PSDA / Geometry)
 *   metadata.skill        → skill
 *   metadata.difficulty   → difficulty
 *   content.passage       → passage
 *   content.question_text → question
 *   content.choices       → choices
 *   content.correct_answer→ correct_answer
 *   content.explanation   → rationale
 *   has_figure, calculator_context → analysis
 *   "College Board QB Math 2026-04" → source
 *
 * Usage: node scripts/ontology/merge_math_to_master.mjs
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const MATH_FILE = join(ROOT, 'ontology', 'math_qb.jsonl');
const MASTER_FILE = join(ROOT, 'master_sat_ontology_v2.jsonl');
const BACKUP_FILE = join(ROOT, 'master_sat_ontology_v2.jsonl.bak');

function normalize(raw) {
  const m = raw.metadata || {};
  const c = raw.content || {};

  return {
    id: m.question_id || '',
    test: 'SAT',
    section: 'Math',                    // RW는 이 필드 없음 → Math 구분자
    domain: m.domain || '',             // Algebra / Advanced Math / PSDA / Geometry
    skill: m.skill || '',
    difficulty: m.difficulty || '',
    passage: c.passage || '',
    question: c.question_text || '',
    choices: c.choices || {},
    correct_answer: c.correct_answer || '',
    rationale: c.explanation || '',
    knowledge_graph: null,
    analysis: {
      has_figure: m.has_figure ?? false,
      calculator_context: m.calculator_context || 'unknown',
    },
    source: 'College Board Question Bank Math (2026-04)',
  };
}

function main() {
  // 입력 파일 확인
  if (!existsSync(MATH_FILE)) {
    console.error('math_qb.jsonl 없음. extract_math_pdf.mjs를 먼저 실행하세요.');
    process.exit(1);
  }
  if (!existsSync(MASTER_FILE)) {
    console.error('master_sat_ontology_v2.jsonl 없음.');
    process.exit(1);
  }

  // 마스터 백업
  copyFileSync(MASTER_FILE, BACKUP_FILE);
  console.log(`백업 → ${BACKUP_FILE}`);

  // 기존 마스터 로드 (중복 체크용 ID 셋)
  const masterLines = readFileSync(MASTER_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  const existingIds = new Set(masterLines.map(l => {
    try { return JSON.parse(l).id; } catch { return null; }
  }).filter(Boolean));
  console.log(`기존 마스터: ${masterLines.length}개 문제`);

  // Math 문제 정규화
  const mathLines = readFileSync(MATH_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  const mathNormalized = [];
  const skipped = [];

  for (const line of mathLines) {
    try {
      const raw = JSON.parse(line);
      const norm = normalize(raw);

      if (!norm.id) {
        skipped.push('(id 없음)');
        continue;
      }
      if (existingIds.has(norm.id)) {
        skipped.push(norm.id);
        continue;
      }

      mathNormalized.push(norm);
    } catch (e) {
      skipped.push(`파싱 오류: ${e.message}`);
    }
  }

  console.log(`Math 추출: ${mathLines.length}개 → 통합 대상: ${mathNormalized.length}개 (중복/오류 제외: ${skipped.length}개)`);

  // 마스터에 추가
  const newLines = mathNormalized.map(q => JSON.stringify(q));
  const merged = [...masterLines, ...newLines].join('\n') + '\n';
  writeFileSync(MASTER_FILE, merged, 'utf-8');

  const totalAfter = masterLines.length + mathNormalized.length;
  console.log(`\n통합 완료: ${masterLines.length} + ${mathNormalized.length} = ${totalAfter}개`);

  // 통계
  const domainCounts = {};
  const diffCounts = {};
  for (const q of mathNormalized) {
    domainCounts[q.domain] = (domainCounts[q.domain] || 0) + 1;
    diffCounts[q.difficulty] = (diffCounts[q.difficulty] || 0) + 1;
  }

  console.log('\n--- 통합된 Math 문제 도메인 ---');
  Object.entries(domainCounts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}개`));

  console.log('\n--- 난이도 ---');
  Object.entries(diffCounts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}개`));

  if (skipped.length > 0) {
    console.log(`\n제외된 항목 (${skipped.length}개):`, skipped.slice(0,5).join(', '));
  }
}

main();
