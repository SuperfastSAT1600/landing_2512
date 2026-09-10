export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const requestId = crypto.randomUUID();

  const [problemsResult, conceptsResult] = await Promise.all([
    supabaseAdmin
      .from('math_problems')
      .select(`
        id, title, difficulty, created_at,
        math_problem_concepts(
          math_concepts(id, name, name_en, slug)
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),

    supabaseAdmin
      .from('math_concepts')
      .select('id, name, name_en, slug, usage_count')
      .order('usage_count', { ascending: false }),
  ]);

  if (problemsResult.error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: problemsResult.error.message } },
      { status: 500 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const problems = (problemsResult.data ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    difficulty: p.difficulty ?? null,
    created_at: p.created_at,
    concepts: ((p.math_problem_concepts ?? []) as unknown as { math_concepts: { id: string; name: string; name_en: string | null; slug: string } | null }[])
      .map((c) => c.math_concepts)
      .filter((c): c is { id: string; name: string; name_en: string | null; slug: string } => c !== null),
  }));

  return NextResponse.json({
    data: {
      problems,
      concepts: conceptsResult.data ?? [],
    },
    meta: { requestId },
  });
}
