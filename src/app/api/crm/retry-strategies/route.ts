import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

const VALID_KINDS = ['initial_contact', 'initial_sales', 'retry'];

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const kind = sp.get('kind');
  const categoryId = sp.get('category_id');
  const segment = sp.get('segment');

  let query = supabaseAdmin
    .from('retry_strategies')
    .select('*')
    .order('created_at', { ascending: true });

  if (kind && VALID_KINDS.includes(kind)) {
    query = query.eq('kind', kind);
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  if (segment === 'b2c' || segment === 'b2b') {
    query = query.eq('segment', segment);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[retry-strategies GET]', error);
    return NextResponse.json({ error: '전략 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    name: string;
    kind?: 'initial_contact' | 'initial_sales' | 'retry';
    category_id?: string;
    description?: string;
    segment?: 'b2c' | 'b2b';
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: '전략 이름을 입력해주세요.' }, { status: 400 });
  }
  if (!body.kind || !VALID_KINDS.includes(body.kind)) {
    return NextResponse.json({ error: '전략 용도를 선택해주세요.' }, { status: 400 });
  }
  if (!body.category_id) {
    return NextResponse.json({ error: '카테고리를 선택해주세요.' }, { status: 400 });
  }

  const segment = body.segment === 'b2b' ? 'b2b' : 'b2c';

  const { data, error } = await supabaseAdmin
    .from('retry_strategies')
    .insert({
      name: body.name.trim(),
      kind: body.kind,
      category_id: body.category_id,
      description: body.description?.trim() || null,
      segment,
    })
    .select()
    .single();

  if (error) {
    console.error('[retry-strategies POST]', error);
    return NextResponse.json({ error: '전략 생성에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
