#!/usr/bin/env node
/**
 * REQ-004 to REQ-007: Extract SAT questions from PDFs using OpenAI document API.
 * Each PDF page = one question. Uses gpt-4o file type content.
 *
 * Usage: OPENAI_API_KEY=sk-... node scripts/ontology/extract_pdfs.mjs
 * Output: ontology/{skill}.jsonl
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const BLOG_DB = join(ROOT, 'blog_database');
const OUT = join(ROOT, 'ontology');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Skills and their PDF groups
const SKILLS = {
  'Standard English Conventions Boundaries': {
    outFile: 'boundaries.jsonl',
    pdfs: [
      { file: 'boundaries_easy_55.pdf', difficulty: 'Easy', expectedCount: 55 },
      { file: 'boundaries_medium_48.pdf', difficulty: 'Medium', expectedCount: 48 },
      { file: 'boundaries_hard_77.pdf', difficulty: 'Hard', expectedCount: 77 },
    ],
    analysisFields: `
      - boundary_rule (e.g., "No punctuation between subject and verb", "Use comma before coordinating conjunction")
      - clause_type (e.g., "Independent clause", "Dependent clause", "Noun phrase")
      - passage_topic (e.g., "Science", "History", "Literature", "Social Science")`,
    analysisSchema: `{"boundary_rule": "", "clause_type": "", "passage_topic": ""}`,
  },
  'Standard English Conventions Form, Structure, and Sense': {
    outFile: 'form_structure_sense.jsonl',
    pdfs: [
      { file: 'Form, Structure, and Sense_easy_77.pdf', difficulty: 'Easy', expectedCount: 77 },
      { file: 'Form, Structure, and Sense_medium_43.pdf', difficulty: 'Medium', expectedCount: 43 },
      { file: 'Form, Structure, and Sense_hard_47.pdf', difficulty: 'Hard', expectedCount: 47 },
    ],
    analysisFields: `
      - grammar_concept (e.g., "Subject-verb agreement", "Pronoun-antecedent agreement", "Verb tense", "Modifier placement")
      - error_type (e.g., "Agreement error", "Tense error", "Parallelism error")
      - passage_topic (e.g., "Science", "History", "Literature", "Social Science")`,
    analysisSchema: `{"grammar_concept": "", "error_type": "", "passage_topic": ""}`,
  },
  'Expression of Ideas Rhetorical Synthesis': {
    outFile: 'rhetorical_synthesis.jsonl',
    pdfs: [
      { file: 'rhetorical synthesis_easy_41.pdf', difficulty: 'Easy', expectedCount: 41 },
      { file: 'rhetorical synthesis_medium_99.pdf', difficulty: 'Medium', expectedCount: 99 },
      { file: 'rhetorical synthesis_hard_42.pdf', difficulty: 'Hard', expectedCount: 42 },
    ],
    analysisFields: `
      - synthesis_task (e.g., "Support a claim", "Introduce a quotation", "Describe data", "Compare findings")
      - rhetorical_purpose (e.g., "Argue", "Inform", "Analyze")
      - passage_topic (e.g., "Science", "History", "Literature", "Social Science")`,
    analysisSchema: `{"synthesis_task": "", "rhetorical_purpose": "", "passage_topic": ""}`,
  },
  'Craft and Structure Text Structure and Purpose': {
    outFile: 'text_structure_purpose.jsonl',
    pdfs: [
      { file: 'Text Structure and Purpose_easy_41.pdf', difficulty: 'Easy', expectedCount: 41 },
      { file: 'Text Structure and Purpose_medium_37.pdf', difficulty: 'Medium', expectedCount: 37 },
      { file: 'Text Structure and Purpose_medium_52.pdf', difficulty: 'Medium', expectedCount: 52 },
    ],
    analysisFields: `
      - structure_pattern (e.g., "Problem-solution", "Compare-contrast", "Cause-effect", "Chronological")
      - author_purpose (e.g., "Describe", "Argue", "Analyze", "Narrate")
      - passage_topic (e.g., "Science", "History", "Literature", "Social Science")`,
    analysisSchema: `{"structure_pattern": "", "author_purpose": "", "passage_topic": ""}`,
  },

  // NEW SKILLS FROM HANDOFF
  'Information and Ideas Central Ideas and Details': {
    outFile: 'central_ideas.jsonl',
    pdfs: [
      { file: 'central ideas and details_easy_33.pdf', difficulty: 'Easy', expectedCount: 33 },
      { file: 'central ideas and details_medium_45.pdf', difficulty: 'Medium', expectedCount: 45 },
      { file: 'central ideas and details_hard_38.pdf', difficulty: 'Hard', expectedCount: 38 },
    ],
    analysisFields: `
      - main_idea_location (e.g., "Opening sentence", "Concluding sentence", "Implicit")
      - detail_function (e.g., "Supporting evidence", "Counterexample", "Elaboration")
      - passage_topic (e.g., "Science", "History", "Literature", "Social Science")`,
    analysisSchema: `{"main_idea_location": "", "detail_function": "", "passage_topic": ""}`,
  },
  'Information and Ideas Command of Evidence': {
    outFile: 'command_of_evidence.jsonl',
    pdfs: [
      { file: 'command of evidence_easy_70.pdf', difficulty: 'Easy', expectedCount: 70 },
      { file: 'command of evidence_medium_77.pdf', difficulty: 'Medium', expectedCount: 77 },
      { file: 'command of evidence_hard_98.pdf', difficulty: 'Hard', expectedCount: 98 },
    ],
    analysisFields: `
      - evidence_type (e.g., "Textual", "Quantitative/Data")
      - reasoning_pattern (e.g., "Strengthen claim", "Weaken claim", "Illustrate finding", "Identify data point")
      - passage_topic (e.g., "Science", "History", "Literature", "Social Science")`,
    analysisSchema: `{"evidence_type": "", "reasoning_pattern": "", "passage_topic": ""}`,
  },
  'Craft and Structure Cross-Text Connections': {
    outFile: 'cross_text.jsonl',
    pdfs: [
      { file: 'cross-text connections_easy_16.pdf', difficulty: 'Easy', expectedCount: 16 },
      { file: 'cross-text connections_medium_19.pdf', difficulty: 'Medium', expectedCount: 19 },
      { file: 'cross-text connections_hard_19.pdf', difficulty: 'Hard', expectedCount: 19 },
    ],
    analysisFields: `
      - relationship_type (e.g., "Agree", "Disagree", "Extend", "Qualify")
      - text_focus (e.g., "Text 1 claims X, Text 2 responds with Y")
      - passage_topic (e.g., "Science", "History", "Literature", "Social Science")`,
    analysisSchema: `{"relationship_type": "", "text_focus": "", "passage_topic": ""}`,
  },
  'Information and Ideas Inferences': {
    outFile: 'inferences.jsonl',
    pdfs: [
      { file: 'inference_easy_20.pdf', difficulty: 'Easy', expectedCount: 20 },
      { file: 'inference_medium_40.pdf', difficulty: 'Medium', expectedCount: 40 },
      { file: 'inference_hard_57.pdf', difficulty: 'Hard', expectedCount: 57 },
    ],
    analysisFields: `
      - inference_basis (e.g., "Explicit statement", "Implicit contrast", "Author tone", "Logical consequence")
      - reasoning_type (e.g., "Deductive", "Inductive", "Analogical")
      - passage_topic (e.g., "Science", "History", "Literature", "Social Science")`,
    analysisSchema: `{"inference_basis": "", "reasoning_type": "", "passage_topic": ""}`,
  },
};

const BATCH_SIZE = 15; // questions per API call (keeps output < 12k tokens)

function makeBatchPrompt(skill, analysisFields, analysisSchema, startPage, endPage) {
  return `You are an expert SAT ontologist. This PDF contains SAT Reading and Writing questions from the "${skill}" skill.

Extract questions from pages ${startPage} to ${endPage} ONLY (each page = one question).

For EACH question on those pages, extract:
- question_id: the alphanumeric ID shown (e.g., "de55ec71")
- difficulty: Easy, Medium, or Hard
- passage: the full passage text (with ___ for blanks if applicable)
- question_text: the full question prompt
- choices: object with A, B, C, D text values
- correct_answer: the letter A, B, C, or D
- explanation: the full explanation/rationale text

Also generate these skill-specific analysis fields:${analysisFields}

Return your answer as JSON only: {"questions": [...questions from pages ${startPage}-${endPage}...]}
Each item schema: {"metadata": {"question_id": "", "difficulty": ""}, "content": {"passage": "", "question_text": "", "choices": {"A": "", "B": "", "C": "", "D": ""}, "correct_answer": "", "explanation": ""}, "analysis": ${analysisSchema}}`;
}

async function uploadPDF(pdfPath) {
  const buf = readFileSync(pdfPath);
  const blob = new Blob([buf], { type: 'application/pdf' });
  const file = await client.files.create({
    file: new File([blob], 'questions.pdf', { type: 'application/pdf' }),
    purpose: 'user_data',
  });
  return file.id;
}

async function extractBatch(fileId, skill, config, startPage, endPage) {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: makeBatchPrompt(skill, config.analysisFields, config.analysisSchema, startPage, endPage),
        },
        {
          type: 'file',
          file: { file_id: fileId },
        },
      ],
    }],
    max_tokens: 16000,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0].message.content;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error("Failed to parse JSON response: " + raw.substring(0, 100));
  }
  
  const questions = parsed.questions ?? parsed.data
    ?? (Array.isArray(parsed) ? parsed : Object.values(parsed).find(v => Array.isArray(v)));

  if (!Array.isArray(questions)) {
    throw new Error(`Unexpected response shape: ${JSON.stringify(Object.keys(parsed))}`);
  }
  return questions;
}

async function extractPDF(pdfPath, skill, config, expectedCount) {
  console.log(`    Uploading ${pdfPath.split(/[/\\\\]/).pop()}...`);
  const fileId = await uploadPDF(pdfPath);
  console.log(`    Uploaded → ${fileId}`);

  const allQuestions = [];
  const totalBatches = Math.ceil(expectedCount / BATCH_SIZE);

  for (let batch = 0; batch < totalBatches; batch++) {
    const startPage = batch * BATCH_SIZE + 1;
    const endPage = Math.min((batch + 1) * BATCH_SIZE, expectedCount);
    process.stdout.write(`    Batch ${batch + 1}/${totalBatches} (pages ${startPage}-${endPage})... `);

    try {
      const questions = await extractBatch(fileId, skill, config, startPage, endPage);
      allQuestions.push(...questions);
      console.log(`${questions.length} questions`);
    } catch (err) {
      console.log(`ERROR: ${err.message.slice(0, 100)}`);
    }

    if (batch < totalBatches - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Clean up uploaded file
  try { await client.files.delete(fileId); } catch {}

  return allQuestions;
}

async function processPDFBatch(skill, config) {
  const outPath = join(OUT, config.outFile);
  const logPath = outPath.replace('.jsonl', '_progress.json');

  // Load existing progress
  let done = new Set();
  if (existsSync(logPath)) {
    try {
      const progress = JSON.parse(readFileSync(logPath, 'utf-8'));
      done = new Set(progress.done || []);
    } catch {}
  }

  let totalExtracted = 0;

  for (const pdfInfo of config.pdfs) {
    const pdfPath = join(BLOG_DB, pdfInfo.file);
    const key = pdfInfo.file;

    if (done.has(key)) {
      console.log(`  [SKIP] ${pdfInfo.file} (already done)`);
      continue;
    }

    console.log(`  [EXTRACT] ${pdfInfo.file} (expected ~${pdfInfo.expectedCount} questions)...`);

    try {
      if (!existsSync(pdfPath)) {
        throw new Error(`File not found: ${pdfPath}`);
      }

      const questions = await extractPDF(pdfPath, skill, config, pdfInfo.expectedCount);

      // Tag each question with source file
      for (const q of questions) {
        if (!q.metadata) q.metadata = {};
        q.metadata.source_file = pdfInfo.file;
        if (!q.metadata.difficulty) {
          q.metadata.difficulty = pdfInfo.difficulty;
        }
        appendFileSync(outPath, JSON.stringify(q, null, 0) + '\\n', 'utf-8');
      }

      done.add(key);
      try { writeFileSync(logPath, JSON.stringify({ done: [...done] }), 'utf-8'); } catch {}

      console.log(`  [OK] ${pdfInfo.file}: ${questions.length} questions extracted`);
      totalExtracted += questions.length;

      // Rate limit buffer
      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      console.error(`  [ERROR] ${pdfInfo.file}: ${err.message}`);
      console.error('  Continuing with next PDF...');
    }
  }

  return totalExtracted;
}

async function main() {
  console.log('=== SAT PDF Extraction Pipeline ===\\n');

  const args = process.argv.slice(2);
  const targetSkills = args.length > 0
    ? Object.fromEntries(Object.entries(SKILLS).filter(([k]) => args.some(a => k.toLowerCase().includes(a.toLowerCase()))))
    : SKILLS;

  if (Object.keys(targetSkills).length === 0) {
    console.error('No matching skills found for:', args);
    process.exit(1);
  }

  let grandTotal = 0;
  for (const [skill, config] of Object.entries(targetSkills)) {
    console.log(`\\n[SKILL] ${skill}`);
    const count = await processPDFBatch(skill, config);
    grandTotal += count;
    console.log(`  Subtotal: ${count} questions`);
  }

  console.log(`\\n=== Done. Total extracted: ${grandTotal} questions ===`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
