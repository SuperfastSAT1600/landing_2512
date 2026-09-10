import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { slugifyConcept } from '@/lib/mathweb-concept-slug';

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50);

  let query = supabaseAdmin
    .from('math_concepts')
    .select(`
      id, name, slug, usage_count,
      math_problem_concepts!inner(
        math_problems!inner(is_active)
      )
    `)
    .eq('math_problem_concepts.math_problems.is_active', true)
    .order('usage_count', { ascending: false })
    .limit(limit);

  if (q) {
    const prefix = slugifyConcept(q);
    if (prefix) query = query.ilike('slug', `${prefix}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    );
  }

  const concepts = (data ?? []).map(({ id, name, slug, usage_count }) => ({
    id, name, slug, usage_count,
  }));

  return NextResponse.json({ data: concepts, meta: { requestId } });
}
