import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabaseAdmin
    .from('math_problems')
    .select(`
      id, title, question_image_url, answer_image_url, memo, is_active, created_at,
      math_problem_concepts (
        math_concepts ( id, name, slug )
      )
    `)
    .eq('id', params.id)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '문제를 찾을 수 없어요.' } },
      { status: 404 }
    );
  }

  const concepts = ((data.math_problem_concepts ?? []) as unknown as { math_concepts: { id: string; name: string; slug: string } | null }[])
    .map((r) => r.math_concepts)
    .filter((c): c is { id: string; name: string; slug: string } => c !== null);

  return NextResponse.json({
    data: { ...data, math_problem_concepts: undefined, concepts },
    meta: { requestId: randomUUID() },
  });
}
