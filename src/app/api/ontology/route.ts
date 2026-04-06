import { NextRequest, NextResponse } from 'next/server';
import { loadCorpus } from '../../../lib/ontology';
import type { SATQuestion, SATDifficulty } from './schema';

const DIFFICULTIES: SATDifficulty[] = ['Easy', 'Medium', 'Hard'];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseLimit(raw: string | null): number {
  const n = parseInt(raw ?? '', 10);
  if (isNaN(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function parseOffset(raw: string | null): number {
  const n = parseInt(raw ?? '', 10);
  if (isNaN(n) || n < 0) return 0;
  return n;
}

function applyFilters(
  questions: SATQuestion[],
  skill: string | null,
  difficulty: string | null,
  hasAnalysis: string | null,
): SATQuestion[] {
  return questions.filter((q) => {
    if (skill && !q.skill.toLowerCase().includes(skill.toLowerCase())) return false;
    if (difficulty && q.difficulty !== difficulty) return false;
    if (hasAnalysis === 'true' && q.analysis === undefined) return false;
    if (hasAnalysis === 'false' && q.analysis !== undefined) return false;
    return true;
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const skill = searchParams.get('skill');
  const difficulty = searchParams.get('difficulty');
  const hasAnalysis = searchParams.get('has_analysis');
  const limit = parseLimit(searchParams.get('limit'));
  const offset = parseOffset(searchParams.get('offset'));

  if (difficulty && !DIFFICULTIES.includes(difficulty as SATDifficulty)) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAM', message: `difficulty must be one of: ${DIFFICULTIES.join(', ')}` } },
      { status: 400 },
    );
  }

  const corpus = await loadCorpus();
  const filtered = applyFilters(corpus, skill, difficulty, hasAnalysis);
  const page = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    data: page,
    meta: {
      total: corpus.length,
      limit,
      offset,
      filtered_total: filtered.length,
    },
  });
}
