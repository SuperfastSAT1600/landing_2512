import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { slugifyConcept } from '@/lib/mathweb-concept-slug';
import { deleteImages } from '@/lib/mathweb-image-store';

function isAuthorized(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY;
}

function unauth() {
  return NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
    { status: 401 }
  );
}

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!isAuthorized(req)) return unauth();

  const { id } = await params;
  const body = await req.json() as {
    title?: string;
    memo?: string;
    is_active?: boolean;
    concepts?: string[];
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.memo !== undefined) updates.memo = body.memo;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { data: problem, error: updateErr } = await supabaseAdmin
    .from('math_problems')
    .update(updates)
    .eq('id', id)
    .select('id, title, memo, is_active, updated_at')
    .single();

  if (updateErr) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: updateErr.message } }, { status: 500 });
  }
  if (!problem) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '문제를 찾을 수 없습니다' } }, { status: 404 });
  }

  let concepts: { id: string; name: string; slug: string }[] | undefined;
  if (body.concepts !== undefined) {
    concepts = await replaceConceptsForProblem(id, body.concepts);
  }

  await supabaseAdmin.from('mathweb_admin_logs').insert({
    action: 'UPDATE',
    problem_id: id,
    payload: { fields: Object.keys(updates), concept_count: body.concepts?.length },
  });

  return NextResponse.json({
    data: { ...problem, ...(concepts !== undefined ? { concepts } : {}) },
    meta: { requestId: crypto.randomUUID() },
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!isAuthorized(req)) return unauth();

  const { id } = await params;

  await deleteImages(id);

  const { error } = await supabaseAdmin.from('math_problems').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  await supabaseAdmin.from('mathweb_admin_logs').insert({
    action: 'DELETE',
    problem_id: id,
    payload: null,
  });

  return new NextResponse(null, { status: 204 });
}

async function replaceConceptsForProblem(problemId: string, names: string[]) {
  await supabaseAdmin.from('math_problem_concepts').delete().eq('problem_id', problemId);

  const results: { id: string; name: string; slug: string }[] = [];
  for (const name of names) {
    const slug = slugifyConcept(name);
    if (!slug) continue;
    const { data: concept, error } = await supabaseAdmin
      .from('math_concepts')
      .upsert({ name, slug }, { onConflict: 'slug', ignoreDuplicates: false })
      .select('id, name, slug')
      .single();
    if (error || !concept) continue;
    await supabaseAdmin.from('math_problem_concepts').insert({ problem_id: problemId, concept_id: concept.id });
    results.push(concept);
  }
  return results;
}
