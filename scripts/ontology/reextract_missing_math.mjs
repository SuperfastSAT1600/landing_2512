#!/usr/bin/env node
/**
 * 누락된 Math 문제 재추출.
 * 이미 추출된 question_id를 skip하고 새 문제만 추가.
 * 부족했던 배치(1,3,4,6,7)를 더 작은 단위로 재시도.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: '.env.local' });

import OpenAI from 'openai';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MATH_FILE = join(ROOT, 'ontology', 'math_qb.jsonl');
const PDF_PATH = join(ROOT, 'blog_database', '260414 QB Math_75.pdf');

// 누락 가능성 높은 배치 (각 배치를 5개씩 더 작게 쪼개서 재시도)
const RETRY_BATCHES = [
  { start: 1, end: 5 },
  { start: 6, end: 10 },
  { start: 21, end: 25 },
  { start: 26, end: 30 },
  { start: 31, end: 35 },
  { start: 36, end: 40 },
  { start: 51, end: 55 },
  { start: 56, end: 60 },
  { start: 61, end: 65 },
  { start: 66, end: 70 },
];

function makePrompt(startPage, endPage) {
  return `You are an expert SAT Math ontologist. This PDF contains SAT Math questions.

Extract ALL questions from pages ${startPage} to ${endPage}.
IMPORTANT: Do not skip any question. Each page has exactly one question.

For EACH question:
- question_id: alphanumeric ID on the page
- difficulty: Easy / Medium / Hard
- domain: Algebra | Advanced Math | Problem-Solving and Data Analysis | Geometry and Trigonometry
- skill: specific skill name
- has_figure: true if references a graph/figure/diagram
- calculator_context: "allowed" | "not_allowed" | "unknown"
- passage: context text above the question (empty string if none)
- question_text: full question prompt
- choices: {A, B, C, D} — use free_response:true if no choices
- correct_answer: A/B/C/D or numeric
- explanation: full rationale

ALL math expressions MUST be LaTeX: $inline$ or $$display$$.

Return JSON only: {"questions": [...]}`;
}

async function uploadPDF() {
  const buf = readFileSync(PDF_PATH);
  const blob = new Blob([buf], { type: 'application/pdf' });
  const file = await client.files.create({
    file: new File([blob], 'math_questions.pdf', { type: 'application/pdf' }),
    purpose: 'user_data',
  });
  return file.id;
}

async function extractBatch(fileId, startPage, endPage) {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: makePrompt(startPage, endPage) },
        { type: 'file', file: { file_id: fileId } },
      ],
    }],
    max_tokens: 12000,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return parsed.questions
    ?? parsed.data
    ?? (Array.isArray(parsed) ? parsed : Object.values(parsed).find(v => Array.isArray(v)))
    ?? [];
}

function toMasterSchema(raw) {
  const m = raw.metadata || raw;
  const c = raw.content || raw;
  return {
    metadata: {
      question_id: m.question_id || raw.question_id || '',
      difficulty: m.difficulty || raw.difficulty || '',
      domain: m.domain || raw.domain || '',
      skill: m.skill || raw.skill || '',
      has_figure: m.has_figure ?? raw.has_figure ?? false,
      calculator_context: m.calculator_context || raw.calculator_context || 'unknown',
    },
    content: {
      passage: c.passage || raw.passage || '',
      question_text: c.question_text || raw.question_text || '',
      choices: c.choices || raw.choices || {},
      correct_answer: c.correct_answer || raw.correct_answer || '',
      explanation: c.explanation || raw.explanation || '',
    },
  };
}

async function main() {
  // 기존 ID 로드
  const existingLines = readFileSync(MATH_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  const existingIds = new Set(existingLines.map(l => {
    try { return JSON.parse(l).metadata?.question_id; } catch { return null; }
  }).filter(Boolean));
  console.log(`기존 추출: ${existingIds.size}개 고유 문제`);
  console.log(`목표: 75개 → 누락 추정: ${75 - existingIds.size}개\n`);

  const fileId = await uploadPDF();
  console.log(`PDF 업로드 완료: ${fileId}\n`);

  let newCount = 0;

  for (const { start, end } of RETRY_BATCHES) {
    process.stdout.write(`  pages ${start}-${end}... `);
    try {
      const questions = await extractBatch(fileId, start, end);
      let added = 0;
      for (const q of questions) {
        const norm = toMasterSchema(q);
        const id = norm.metadata.question_id;
        if (!id || existingIds.has(id)) continue;
        existingIds.add(id);
        appendFileSync(MATH_FILE, JSON.stringify(norm) + '\n', 'utf-8');
        added++;
        newCount++;
      }
      console.log(`${questions.length}개 추출, ${added}개 신규 추가`);
    } catch (e) {
      console.log(`ERROR: ${e.message.slice(0, 80)}`);
    }
    await new Promise(r => setTimeout(r, 600));
  }

  try { await client.files.delete(fileId); } catch {}

  const finalLines = readFileSync(MATH_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  console.log(`\n재추출 완료: ${newCount}개 신규 추가 → 총 ${finalLines.length}개`);
}

main().catch(console.error);
