import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const requestId = crypto.randomUUID();
  const { slug } = await params;

  const { data: concept, error: conceptError } = await supabaseAdmin
    .from('math_concepts')
    .select('id, name, slug, usage_count')
    .eq('slug', slug)
    .single();

  if (conceptError || !concept) {
    return NextResponse.json(
      { error: { code: 'CONCEPT_NOT_FOUND', message: '해당 개념을 찾을 수 없어요.' } },
      { status: 404 },
    );
  }

  const { data: joins, error: joinsError } = await supabaseAdmin
    .from('math_problem_concepts')
    .select(`
      math_problems!inner(
        id, title, question_image_url, answer_image_url, answer_text, memo, created_at, is_active,
        math_problem_concepts(
          math_concepts(id, name, slug)
        )
      )
    `)
    .eq('concept_id', concept.id)
    .eq('math_problems.is_active', true);

  if (joinsError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: joinsError.message } },
      { status: 500 },
    );
  }

  const problems = (joins ?? []).map((j) => {
    const p = j.math_problems as unknown as {
      id: string; title: string | null; question_image_url: string;
      answer_image_url: string | null; answer_text: string | null; memo: string | null; created_at: string;
      math_problem_concepts: { math_concepts: { id: string; name: string; slug: string } | null }[];
    };
    return {
      id: p.id,
      title: p.title,
      question_image_url: p.question_image_url,
      answer_image_url: p.answer_image_url,
      answer_text: p.answer_text,
      memo: p.memo,
      created_at: p.created_at,
      concepts: p.math_problem_concepts
        .map((c) => c.math_concepts)
        .filter((c): c is { id: string; name: string; slug: string } => c !== null),
    };
  });

  return NextResponse.json({
    data: { concept, problems },
    meta: { requestId },
  });
}
