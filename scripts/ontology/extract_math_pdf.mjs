#!/usr/bin/env node
/**
 * Extract SAT Math questions from PDF using OpenAI GPT-4o.
 * Math-specific: formulas extracted as LaTeX, domain/skill auto-classified.
 *
 * Usage: node scripts/ontology/extract_math_pdf.mjs
 * Output: ontology/math_qb.jsonl
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: '.env.local' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const BLOG_DB = join(ROOT, 'blog_database');
const OUT = join(ROOT, 'ontology');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MATH_PDF = {
  file: '260414 QB Math_75.pdf',
  expectedCount: 75,
  outFile: 'math_qb.jsonl',
};

const BATCH_SIZE = 10;

function makeMathBatchPrompt(startPage, endPage) {
  return `You are an expert SAT Math ontologist. This PDF contains SAT Math questions from the College Board Question Bank.

Extract questions from pages ${startPage} to ${endPage} ONLY (each page = one question).

For EACH question on those pages, extract:
- question_id: the alphanumeric ID shown on the page (e.g., "a3f7c912")
- difficulty: Easy, Medium, or Hard (shown on the page)
- passage: any context text or table above the question (empty string if none)
- question_text: the full question prompt text
- choices: object with A, B, C, D text values. If no multiple choice (free-response), use {"A": "", "B": "", "C": "", "D": "", "free_response": true}
- correct_answer: the letter A/B/C/D or the numeric answer if free-response
- explanation: the full explanation/rationale text

CRITICAL — Math formula rules:
- ALL mathematical expressions MUST be in LaTeX notation
- Inline expressions: use $...$ (e.g., $x^2 + 3x - 4$)
- Display equations: use $$...$$ on its own line
- Examples: $\\frac{a}{b}$, $\\sqrt{x}$, $x^2$, $\\pi r^2$, $y = mx + b$
- Do NOT use Unicode math symbols (², ³, √, ÷). Use LaTeX only.

Also classify each question:
- domain: one of ["Algebra", "Advanced Math", "Problem-Solving and Data Analysis", "Geometry and Trigonometry"]
- skill: specific skill within domain (e.g., "Linear equations in one variable", "Quadratic equations", "Ratios and proportions", "Area and volume", "Right triangles and trigonometry")
- has_figure: true if the question references a graph, figure, or diagram (even if the image isn't extractable)
- calculator_context: "allowed" or "not_allowed" or "unknown"

Return JSON only: {"questions": [...questions from pages ${startPage}-${endPage}...]}

Each item schema:
{
  "metadata": {
    "question_id": "",
    "difficulty": "",
    "domain": "",
    "skill": "",
    "has_figure": false,
    "calculator_context": "unknown"
  },
  "content": {
    "passage": "",
    "question_text": "",
    "choices": {"A": "", "B": "", "C": "", "D": ""},
    "correct_answer": "",
    "explanation": ""
  }
}`;
}

async function uploadPDF(pdfPath) {
  console.log(`  Uploading ${pdfPath.split(/[/\\]/).pop()}...`);
  const buf = readFileSync(pdfPath);
  const blob = new Blob([buf], { type: 'application/pdf' });
  const file = await client.files.create({
    file: new File([blob], 'math_questions.pdf', { type: 'application/pdf' }),
    purpose: 'user_data',
  });
  console.log(`  Uploaded → ${file.id}`);
  return file.id;
}

async function extractBatch(fileId, startPage, endPage) {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: makeMathBatchPrompt(startPage, endPage) },
        { type: 'file', file: { file_id: fileId } },
      ],
    }],
    max_tokens: 16000,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0].message.content;
  const parsed = JSON.parse(raw);
  const questions = parsed.questions
    ?? parsed.data
    ?? (Array.isArray(parsed) ? parsed : Object.values(parsed).find(v => Array.isArray(v)));

  if (!Array.isArray(questions)) {
    throw new Error(`Unexpected shape: ${JSON.stringify(Object.keys(parsed))}`);
  }
  return questions;
}

async function main() {
  console.log('=== SAT Math PDF Extraction ===\n');

  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  const pdfPath = join(BLOG_DB, MATH_PDF.file);
  const outPath = join(OUT, MATH_PDF.outFile);
  const logPath = outPath.replace('.jsonl', '_progress.json');

  if (!existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  // Resume support
  let donePages = new Set();
  let allExtracted = 0;
  if (existsSync(logPath)) {
    try {
      const progress = JSON.parse(readFileSync(logPath, 'utf-8'));
      donePages = new Set(progress.donePages || []);
      allExtracted = progress.totalExtracted || 0;
      console.log(`  Resuming: ${donePages.size} batches already done, ${allExtracted} questions so far`);
    } catch {}
  }

  const fileId = await uploadPDF(pdfPath);
  const totalBatches = Math.ceil(MATH_PDF.expectedCount / BATCH_SIZE);

  for (let batch = 0; batch < totalBatches; batch++) {
    const startPage = batch * BATCH_SIZE + 1;
    const endPage = Math.min((batch + 1) * BATCH_SIZE, MATH_PDF.expectedCount);
    const batchKey = `${startPage}-${endPage}`;

    if (donePages.has(batchKey)) {
      console.log(`  [SKIP] pages ${batchKey} (already done)`);
      continue;
    }

    process.stdout.write(`  [BATCH ${batch + 1}/${totalBatches}] pages ${batchKey}... `);

    try {
      const questions = await extractBatch(fileId, startPage, endPage);

      for (const q of questions) {
        appendFileSync(outPath, JSON.stringify(q) + '\n', 'utf-8');
      }

      allExtracted += questions.length;
      donePages.add(batchKey);
      writeFileSync(logPath, JSON.stringify({ donePages: [...donePages], totalExtracted: allExtracted }), 'utf-8');
      console.log(`${questions.length}개 추출`);
    } catch (err) {
      console.log(`ERROR: ${err.message.slice(0, 120)}`);
    }

    if (batch < totalBatches - 1) {
      await new Promise(r => setTimeout(r, 800));
    }
  }

  try { await client.files.delete(fileId); } catch {}

  console.log(`\n=== 완료. 총 ${allExtracted}개 문제 추출 → ${outPath} ===`);

  // Quick stats
  if (existsSync(outPath)) {
    const lines = readFileSync(outPath, 'utf-8').trim().split('\n').filter(Boolean);
    const domains = {};
    const difficulties = {};
    let hasFigure = 0;
    for (const line of lines) {
      try {
        const q = JSON.parse(line);
        const d = q.metadata?.domain || 'Unknown';
        const diff = q.metadata?.difficulty || 'Unknown';
        domains[d] = (domains[d] || 0) + 1;
        difficulties[diff] = (difficulties[diff] || 0) + 1;
        if (q.metadata?.has_figure) hasFigure++;
      } catch {}
    }
    console.log('\n--- 도메인 분포 ---');
    Object.entries(domains).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}개`));
    console.log('\n--- 난이도 분포 ---');
    Object.entries(difficulties).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}개`));
    console.log(`\n  그래프/도표 포함: ${hasFigure}개`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
