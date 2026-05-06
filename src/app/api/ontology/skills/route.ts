import { NextResponse } from 'next/server';
import { loadCorpus } from '../../../../lib/ontology';
import type { SATDifficulty } from '../schema';

interface SkillStats {
  skill: string;
  total: number;
  by_difficulty: Record<SATDifficulty, number>;
  analysis_coverage: number;
}

const DIFFICULTIES: SATDifficulty[] = ['Easy', 'Medium', 'Hard'];

function buildSkillStats(skillMap: Map<string, { total: number; byDiff: Record<SATDifficulty, number>; withAnalysis: number }>): SkillStats[] {
  return Array.from(skillMap.entries()).map(([skill, stats]) => ({
    skill,
    total: stats.total,
    by_difficulty: stats.byDiff,
    analysis_coverage:
      stats.total > 0 ? Math.round((stats.withAnalysis / stats.total) * 100) / 100 : 0,
  }));
}

export async function GET() {
  const corpus = await loadCorpus();

  const skillMap = new Map<string, { total: number; byDiff: Record<SATDifficulty, number>; withAnalysis: number }>();

  for (const q of corpus) {
    if (!skillMap.has(q.skill)) {
      skillMap.set(q.skill, {
        total: 0,
        byDiff: { Easy: 0, Medium: 0, Hard: 0 },
        withAnalysis: 0,
      });
    }
    const stats = skillMap.get(q.skill)!;
    stats.total += 1;
    if (DIFFICULTIES.includes(q.difficulty)) {
      stats.byDiff[q.difficulty] += 1;
    }
    if (q.analysis !== undefined) {
      stats.withAnalysis += 1;
    }
  }

  const data = buildSkillStats(skillMap).sort((a, b) => b.total - a.total);

  return NextResponse.json({ data });
}
