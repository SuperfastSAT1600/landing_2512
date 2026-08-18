/**
 * Analyze SAT passages for "secondary meaning traps"
 *
 * Reads ontology/master_unified.jsonl (1,174 questions) and uses OpenAI API
 * to identify words used in their 2nd–4th Merriam-Webster definition where
 * students relying on the 1st definition would misunderstand the sentence.
 *
 * Run:
 *   OPENAI_API_KEY=sk-... node scripts/analyze-secondary-meanings.mjs
 *
 * Outputs:
 *   content/data/secondary-meaning-words.json
 *   content/data/secondary-meaning-words.csv
 *
 * Resume support: already-processed IDs are skipped on re-run via
 *   scripts/analysis-progress.jsonl
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Config ────────────────────────────────────────────────────────────────────
const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set.');
  console.error('Usage: OPENAI_API_KEY=sk-... node scripts/analyze-secondary-meanings.mjs');
  process.exit(1);
}

const client = new OpenAI({ apiKey: API_KEY });
const MODEL = 'gpt-4o-mini';
const BATCH_SIZE = 5;   // concurrent requests per batch
const DELAY_MS = 500;   // delay between batches (ms)

const INPUT_FILE = join(ROOT, 'ontology', 'master_unified.jsonl');
const PROGRESS_FILE = join(__dirname, 'analysis-progress.jsonl');
const OUTPUT_JSON = join(ROOT, 'content', 'data', 'secondary-meaning-words.json');
const OUTPUT_CSV = join(ROOT, 'content', 'data', 'secondary-meaning-words.csv');

// ── Load already-processed IDs ────────────────────────────────────────────────
function loadProcessedIds() {
  if (!existsSync(PROGRESS_FILE)) return new Set();
  const lines = readFileSync(PROGRESS_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  const ids = new Set();
  for (const line of lines) {
    try { ids.add(JSON.parse(line).id); } catch {}
  }
  return ids;
}

// ── Load all questions ────────────────────────────────────────────────────────
function loadQuestions() {
  const lines = readFileSync(INPUT_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

// ── OpenAI API call ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert SAT vocabulary analyst. Your job is to find "secondary meaning traps" in SAT passages — words that students commonly misread because they default to the word's most familiar (1st) Merriam-Webster definition, when the passage actually uses a less familiar (2nd, 3rd, or 4th) definition.

Always respond with a valid JSON array only. No markdown, no explanation.`;

const USER_PROMPT_TEMPLATE = (passage, skill) => `Find words in this SAT passage that meet ALL criteria:
1. The word has a very familiar PRIMARY meaning that most high school students know well
2. But in this specific passage, the word is used in its 2nd, 3rd, or 4th Merriam-Webster definition
3. A student relying only on the primary meaning would misunderstand the sentence

EXCLUDE: rare/obscure words, technical jargon, proper nouns, words used in their obvious primary meaning.

For each qualifying word return:
- word: base form (lemma)
- pos: noun | verb | adjective | adverb
- primary_definition_en: familiar 1st definition (the "trap")
- primary_definition_ko: Korean translation of 1st definition
- mw_definition_number: which MW definition is actually used (2, 3, or 4)
- sat_meaning_en: the definition actually used in the passage
- sat_meaning_ko: Korean translation of sat_meaning_en
- passage_snippet: exact 15–20 word excerpt containing the word

Respond with JSON array only. Return [] if no qualifying words found.

PASSAGE: ${passage}
SKILL: ${skill}`;

async function analyzeQuestion(question) {
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + '\nWrap your array in {"words": [...]}' },
      { role: 'user', content: USER_PROMPT_TEMPLATE(question.passage, question.skill) },
    ],
  });

  const text = response.choices[0].message.content ?? '{}';
  try {
    const parsed = JSON.parse(text);
    const words = parsed.words ?? parsed;
    return Array.isArray(words) ? words : [];
  } catch {
    return [];
  }
}

// ── Batch processor ───────────────────────────────────────────────────────────
async function processBatch(batch, processedIds) {
  const results = await Promise.allSettled(
    batch.map(async (q) => {
      if (processedIds.has(q.id)) return null;
      try {
        const words = await analyzeQuestion(q);
        const entry = {
          id: q.id,
          skill: q.skill,
          difficulty: q.difficulty,
          words: words.map((w) => ({
            ...w,
            question_id: q.id,
            skill: q.skill,
            difficulty: q.difficulty,
            source: 'master_unified',
          })),
        };
        appendFileSync(PROGRESS_FILE, JSON.stringify(entry) + '\n');
        processedIds.add(q.id);
        return entry;
      } catch (err) {
        console.error(`\n  Error on ${q.id}: ${err.message}`);
        return null;
      }
    })
  );

  return results
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value);
}

// ── Deduplicate words across questions ────────────────────────────────────────
function deduplicateWords(allEntries) {
  const wordMap = new Map();
  for (const entry of allEntries) {
    for (const w of entry.words ?? []) {
      const key = w.word?.toLowerCase();
      if (!key) continue;
      if (!wordMap.has(key)) {
        wordMap.set(key, { ...w, occurrences: [] });
      }
      const existing = wordMap.get(key);
      existing.occurrences.push({
        question_id: w.question_id,
        skill: w.skill,
        difficulty: w.difficulty,
        passage_snippet: w.passage_snippet,
      });
    }
  }
  return Array.from(wordMap.values()).sort((a, b) => a.word.localeCompare(b.word));
}

// ── Generate CSV ──────────────────────────────────────────────────────────────
function generateCsv(words) {
  const header = 'word,pos,primary_definition_en,primary_definition_ko,mw_definition_number,sat_meaning_en,sat_meaning_ko,skills,difficulties,occurrence_count';
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = words.map((w) => {
    const skillAbbr = (s) => s.replace('Craft and Structure ', '').replace('Expression of Ideas ', '').replace('Standard English Conventions ', '').replace('Information and Ideas ', '');
    const skills = [...new Set(w.occurrences.map((o) => skillAbbr(o.skill)))].join(' | ');
    const diffs = [...new Set(w.occurrences.map((o) => o.difficulty))].join(' | ');
    return [esc(w.word), esc(w.pos), esc(w.primary_definition_en), esc(w.primary_definition_ko), w.mw_definition_number ?? '', esc(w.sat_meaning_en), esc(w.sat_meaning_ko), esc(skills), esc(diffs), w.occurrences.length].join(',');
  });
  return [header, ...rows].join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Loading questions...');
  const questions = loadQuestions();
  console.log(`Loaded ${questions.length} questions from master_unified.jsonl`);

  const processedIds = loadProcessedIds();
  const remaining = questions.filter((q) => !processedIds.has(q.id));
  console.log(`Already processed: ${processedIds.size} | Remaining: ${remaining.length}`);

  if (remaining.length > 0) {
    console.log(`Processing with ${MODEL} in batches of ${BATCH_SIZE}...\n`);
    let done = 0;
    let totalWordsFound = 0;

    for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
      const batch = remaining.slice(i, i + BATCH_SIZE);
      const results = await processBatch(batch, processedIds);
      done += batch.length;
      totalWordsFound += results.reduce((sum, r) => sum + (r?.words?.length ?? 0), 0);

      const pct = Math.round((done / remaining.length) * 100);
      process.stdout.write(`\r  Progress: ${done}/${remaining.length} (${pct}%) | Words found: ${totalWordsFound}`);

      if (i + BATCH_SIZE < remaining.length) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }
    console.log('\n');
  }

  // ── Aggregate results ─────────────────────────────────────────────────────
  console.log('Aggregating results...');
  const progressLines = readFileSync(PROGRESS_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  const allEntries = progressLines.map((l) => JSON.parse(l));
  const allWords = deduplicateWords(allEntries);

  const totalWithWords = allEntries.filter((e) => e.words?.length > 0).length;
  console.log(`Questions with secondary meaning words: ${totalWithWords}/${allEntries.length}`);
  console.log(`Unique secondary meaning words found: ${allWords.length}`);

  // ── Write output files ────────────────────────────────────────────────────
  writeFileSync(OUTPUT_JSON, JSON.stringify(allWords, null, 2));
  writeFileSync(OUTPUT_CSV, generateCsv(allWords));
  console.log(`\nOutput written:`);
  console.log(`  ${OUTPUT_JSON}`);
  console.log(`  ${OUTPUT_CSV}`);

  // ── Distribution summary ──────────────────────────────────────────────────
  const byDiff = {};
  for (const w of allWords) {
    for (const o of w.occurrences) {
      byDiff[o.difficulty] = (byDiff[o.difficulty] ?? 0) + 1;
    }
  }
  console.log('\nBy difficulty:');
  for (const [d, c] of Object.entries(byDiff)) console.log(`  ${d}: ${c}`);

  // ── Verify known words ────────────────────────────────────────────────────
  const known = ['contracted', 'singular', 'disputing', 'determine', 'endure', 'assumed', 'answers'];
  const found = known.filter((kw) => allWords.some((w) => w.word?.toLowerCase() === kw));
  const missing = known.filter((kw) => !allWords.some((w) => w.word?.toLowerCase() === kw));
  console.log(`\nKnown words found: ${found.join(', ') || 'none'}`);
  if (missing.length) console.log(`Missing: ${missing.join(', ')}`);
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
