import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { slugifyConcept } from '@/lib/mathweb-concept-slug';
import {
  validateImageFile,
  uploadImage,
  deleteImages,
  ValidationError,
} from '@/lib/mathweb-image-store';

function isAuthorized(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY;
}

function unauth() {
  return NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
    { status: 401 }
  );
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return unauth();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const search = searchParams.get('search') ?? '';
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('math_problems')
    .select(
      'id, title, question_image_url, answer_image_url, memo, is_active, created_at, math_problem_concepts(math_concepts(id, name, slug))',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  const problems = (data ?? []).map((p) => ({
    ...p,
    concepts: (p.math_problem_concepts as unknown as { math_concepts: { id: string; name: string; slug: string } | null }[])
      .map((join) => join.math_concepts)
      .filter(Boolean),
    math_problem_concepts: undefined,
  }));

  return NextResponse.json({
    data: problems,
    meta: { total: count ?? 0, page, limit, requestId: crypto.randomUUID() },
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauth();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_FORM', message: 'multipart/form-data 필요' } }, { status: 400 });
  }

  const questionImage = formData.get('question_image') as File | null;
  const answerImage = formData.get('answer_image') as File | null;
  const memo = (formData.get('memo') as string | null) ?? undefined;
  const title = (formData.get('title') as string | null) ?? undefined;
  const answerText = (formData.get('answer_text') as string | null) ?? undefined;
  const conceptsRaw = formData.get('concepts') as string | null;

  if (!questionImage) {
    return NextResponse.json({ error: { code: 'MISSING_IMAGE', message: '문제 이미지가 필요합니다' } }, { status: 400 });
  }

  let conceptNames: string[] = [];
  try {
    conceptNames = conceptsRaw ? (JSON.parse(conceptsRaw) as string[]) : [];
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_CONCEPTS', message: 'concepts는 JSON 배열이어야 합니다' } }, { status: 400 });
  }

  if (conceptNames.length === 0) {
    return NextResponse.json({ error: { code: 'MISSING_CONCEPTS', message: '개념을 1개 이상 입력해주세요' } }, { status: 400 });
  }

  try {
    validateImageFile(questionImage);
    if (answerImage) validateImageFile(answerImage);
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: { code: 'INVALID_IMAGE', message: e.message } }, { status: 400 });
    }
    throw e;
  }

  const problemId = crypto.randomUUID();

  const questionUrl = await uploadImage(problemId, 'question', questionImage);
  const answerUrl = answerImage ? await uploadImage(problemId, 'answer', answerImage) : null;

  const { data: problem, error: insertErr } = await supabaseAdmin
    .from('math_problems')
    .insert({ id: problemId, title, question_image_url: questionUrl, answer_image_url: answerUrl, answer_text: answerText ?? null, memo })
    .select('id, question_image_url, answer_image_url, answer_text')
    .single();

  if (insertErr) {
    await deleteImages(problemId);
    return NextResponse.json({ error: { code: 'DB_ERROR', message: insertErr.message } }, { status: 500 });
  }

  const concepts = await upsertConcepts(problemId, conceptNames);

  await supabaseAdmin.from('mathweb_admin_logs').insert({
    action: 'CREATE',
    problem_id: problemId,
    payload: { title, concept_count: conceptNames.length },
  });

  return NextResponse.json(
    { data: { ...problem, concepts }, meta: { requestId: crypto.randomUUID() } },
    { status: 201 }
  );
}

async function upsertConcepts(problemId: string, names: string[]) {
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
