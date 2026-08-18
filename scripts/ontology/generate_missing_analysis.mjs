#!/usr/bin/env node
import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const IN_FILE = join(ROOT, 'master_sat_ontology_v2.jsonl');
const OUT_FILE = join(ROOT, 'master_sat_ontology_v3_temp.jsonl');

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("OPENAI_API_KEY is not set.");
  process.exit(1);
}

const client = new OpenAI({ apiKey });

const SCHEMAS = {
  'Standard English Conventions Boundaries': `{"boundary_rule": "", "clause_type": "", "passage_topic": ""}`,
  'Standard English Conventions Form, Structure, and Sense': `{"grammar_concept": "", "error_type": "", "passage_topic": ""}`,
  'Expression of Ideas Rhetorical Synthesis': `{"synthesis_task": "", "rhetorical_purpose": "", "passage_topic": ""}`,
  'Craft and Structure Text Structure and Purpose': `{"structure_pattern": "", "author_purpose": "", "passage_topic": ""}`,
  'Expression of Ideas Transitions': `{"target_transition_category": "", "sentence_1_summary": "", "sentence_2_summary": "", "passage_topic": ""}`,
  'Craft and Structure Words in Context': `{"target_word_pos": "", "passage_logical_flow": "", "passage_topic": "", "synonyms_for_correct_answer": []}`,
  'Information and Ideas Central Ideas and Details': `{"main_idea_location": "", "detail_function": "", "passage_topic": ""}`,
  'Information and Ideas Command of Evidence': `{"evidence_type": "", "reasoning_pattern": "", "passage_topic": ""}`,
  'Craft and Structure Cross-Text Connections': `{"relationship_type": "", "text_focus": "", "passage_topic": ""}`,
  'Information and Ideas Inferences': `{"inference_basis": "", "reasoning_type": "", "passage_topic": ""}`,
};

const BATCH_SIZE = 10;

async function generateMissing(batch) {
  const promptParts = batch.map((item, index) => {
    const schema = SCHEMAS[item.skill] || `{}`;
    return `
Question Index: ${index}
Question ID: ${item.id}
Skill: ${item.skill}
Passage: ${item.passage}
Question: ${item.question}
Choices: ${JSON.stringify(item.choices)}
Correct: ${item.correct_answer}
Rationale: ${item.rationale}
Expected Analysis Schema: ${schema}
---`;
  }).join("\n");

  const prompt = `You are an expert SAT ontologist. Your task is to generate the "analysis" JSON for the following ${batch.length} SAT Reading and Writing questions.
Analyze the passage, question, and rationale to fill out the exact Expected Analysis Schema for each question.

Respond ONLY with a JSON object that has an "evaluations" array. Each evaluation must have two keys: "id" (the Question ID) and "analysis" (the filled JSON schema).
Format:
{
  "evaluations": [
    { "id": "...", "analysis": { ... } }
  ]
}

Questions:
${promptParts}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    const raw = response.choices[0].message.content;
    const parsed = JSON.parse(raw);
    return parsed.evaluations || [];
  } catch (err) {
    console.error("Batch generation failed:", err.message);
    return [];
  }
}

async function main() {
  console.log("Loading master DB...");
  const lines = readFileSync(IN_FILE, 'utf-8').split('\n').filter(Boolean);
  const data = lines.map(l => JSON.parse(l));

  // Clear output file
  writeFileSync(OUT_FILE, '');

  let needingDocs = [];
  let alreadyGooddocs = [];
  
  for (const item of data) {
    if (!item.analysis || Object.keys(item.analysis).length === 0) {
      if (SCHEMAS[item.skill]) {
        needingDocs.push(item);
      } else {
        item.analysis = null;
        alreadyGooddocs.push(item);
      }
    } else {
      alreadyGooddocs.push(item);
    }
  }

  console.log(`Found ${alreadyGooddocs.length} valid entries and ${needingDocs.length} needing generation.`);

  // Write already good ones
  for (const item of alreadyGooddocs) {
    appendFileSync(OUT_FILE, JSON.stringify(item) + '\n');
  }

  // Process needingDocs in batches
  for (let i = 0; i < needingDocs.length; i += BATCH_SIZE) {
    const batch = needingDocs.slice(i, i + BATCH_SIZE);
    process.stdout.write(`Processing batch ${i / BATCH_SIZE + 1}/${Math.ceil(needingDocs.length / BATCH_SIZE)}... `);

    const generated = await generateMissing(batch);
    if (!Array.isArray(generated)) {
      console.log("Failed (invalid response format)");
    } else {
      let matched = 0;
      for (const item of batch) {
        const found = generated.find(g => g.id === item.id);
        if (found && found.analysis) {
          item.analysis = found.analysis;
          matched++;
        }
        appendFileSync(OUT_FILE, JSON.stringify(item) + '\n');
      }
      console.log(`Done (${matched}/${batch.length} generated).`);
    }

    if (i + BATCH_SIZE < needingDocs.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\nFinished! Check ${OUT_FILE}`);
  console.log("If everything looks correct, rename it to replace master_sat_ontology_v2.jsonl.");
}

main().catch(console.error);
