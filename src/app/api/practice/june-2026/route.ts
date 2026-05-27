import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import path from 'path';
import readline from 'readline';
import { JUNE_2026_SET } from '@/data/practice-sets/june-2026';

export const revalidate = 86400;

interface RawQuestion {
  id: string;
  skill: string;
  difficulty: string;
  passage: string;
  question: string;
  choices: Record<string, string>;
  correct_answer: string;
  rationale: string;
}

const SKILL_LABEL: Record<string, string> = {
  'Standard English Conventions Boundaries': 'Boundaries',
  'Standard English Conventions Form, Structure, and Sense': 'Form & Sense',
  'Expression of Ideas Rhetorical Synthesis': 'Rhetorical Synthesis',
  'Expression of Ideas Transitions': 'Transitions',
  'Craft and Structure Words in Context': 'Words in Context',
  'Craft and Structure Cross-Text Connections': 'Cross-Text Connections',
};

async function loadQuestions(ids: readonly string[]): Promise<RawQuestion[]> {
  const idSet = new Set(ids);
  const filePath = path.join(process.cwd(), 'master_sat_ontology_v3.jsonl');
  const seen = new Set<string>();
  const questions: RawQuestion[] = [];

  const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const q = JSON.parse(trimmed) as RawQuestion;
      if (idSet.has(q.id) && !seen.has(q.id)) {
        seen.add(q.id);
        questions.push(q);
      }
    } catch {
      // skip malformed lines
    }
  }

  // preserve original selection order
  const orderMap = new Map(ids.map((id, i) => [id, i]));
  questions.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return questions;
}

export async function GET() {
  const questions = await loadQuestions(JUNE_2026_SET.questionIds);

  const grouped: Record<string, { label: string; questions: RawQuestion[] }> = {};
  for (const q of questions) {
    const skill = q.skill;
    if (!grouped[skill]) {
      grouped[skill] = { label: SKILL_LABEL[skill] ?? skill, questions: [] };
    }
    grouped[skill].questions.push(q);
  }

  const groups = Object.entries(grouped).map(([skill, { label, questions: qs }]) => ({
    skill,
    label,
    total: qs.length,
    questions: qs.map((q) => ({
      id: q.id,
      difficulty: q.difficulty,
      passage: q.passage,
      question: q.question,
      choices: q.choices,
      correct_answer: q.correct_answer,
      rationale: q.rationale,
    })),
  }));

  return NextResponse.json({
    setId: JUNE_2026_SET.setId,
    title: JUNE_2026_SET.title,
    total: questions.length,
    groups,
  });
}
