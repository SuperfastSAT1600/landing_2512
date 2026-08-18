import { NextResponse } from 'next/server';
import { loadCorpus } from '../../../../lib/ontology';

interface ErrorTypeEntry {
  skill: string;
  error_type: string;
  count: number;
}

type SkillErrorKey = `${string}::${string}`;

/**
 * Aggregates error_type frequencies from analysis fields.
 * Supports both a direct `error_type` string and a `wrong_answer_analysis`
 * array/object whose values contain `error_type`.
 */
function extractErrorType(analysis: Record<string, unknown>): string | null {
  if (typeof analysis.error_type === 'string' && analysis.error_type) {
    return analysis.error_type;
  }
  return null;
}

export async function GET() {
  const corpus = await loadCorpus();

  const counts = new Map<SkillErrorKey, number>();

  for (const q of corpus) {
    if (!q.analysis) continue;
    const analysis = q.analysis as Record<string, unknown>;

    // Direct error_type on analysis object
    const errorType = extractErrorType(analysis);
    if (errorType) {
      const key: SkillErrorKey = `${q.skill}::${errorType}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      continue;
    }

    // wrong_answer_analysis: array of objects with error_type
    const waa = analysis.wrong_answer_analysis;
    if (Array.isArray(waa)) {
      for (const entry of waa as Record<string, unknown>[]) {
        if (typeof entry === 'object' && entry !== null) {
          const et = typeof entry.error_type === 'string' ? entry.error_type : null;
          if (et) {
            const key: SkillErrorKey = `${q.skill}::${et}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
        }
      }
    }
  }

  const data: ErrorTypeEntry[] = Array.from(counts.entries())
    .map(([key, count]) => {
      const sep = key.indexOf('::');
      return {
        skill: key.slice(0, sep),
        error_type: key.slice(sep + 2),
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ data });
}
