import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { slugifyConcept } from '@/lib/mathweb-concept-slug';

function isAuthorized(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY;
}

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const { name } = await req.json() as { name?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: { code: 'MISSING_NAME', message: '개념 이름을 입력해주세요.' } }, { status: 400 });
  }

  const slug = slugifyConcept(name.trim());
  if (!slug) {
    return NextResponse.json({ error: { code: 'INVALID_NAME', message: '유효한 개념 이름이 아닙니다.' } }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('math_concepts')
    .update({ name: name.trim(), slug })
    .eq('id', id)
    .select('id, name, slug, usage_count')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: { code: 'DUPLICATE', message: '이미 존재하는 개념 이름입니다.' } }, { status: 409 });
    }
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ data, meta: { requestId: crypto.randomUUID() } });
}
