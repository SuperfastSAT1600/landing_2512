import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { apiError, unauthorized } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return unauthorized();

  const sp = new URL(request.url).searchParams;
  const categoryId = sp.get('category_id');
  const segment = sp.get('segment');

  let query = supabaseAdmin
    .from('retry_strategies')
    .select('*')
    .order('created_at', { ascending: true });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  if (segment === 'b2c' || segment === 'b2b') {
    query = query.eq('segment', segment);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[retry-strategies GET]', error);
    return apiError('INTERNAL_ERROR', '전략 목록을 불러오지 못했습니다.', 500);
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) return unauthorized();

  let body: {
    name: string;
    category_id?: string;
    description?: string;
    segment?: 'b2c' | 'b2b';
  };
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  if (!body.name?.trim()) {
    return apiError('BAD_REQUEST', '전략 이름을 입력해주세요.', 400);
  }
  if (!body.category_id) {
    return apiError('BAD_REQUEST', '카테고리를 선택해주세요.', 400);
  }

  const segment = body.segment === 'b2b' ? 'b2b' : 'b2c';

  const { data, error } = await supabaseAdmin
    .from('retry_strategies')
    .insert({
      name: body.name.trim(),
      category_id: body.category_id,
      description: body.description?.trim() || null,
      segment,
    })
    .select()
    .single();

  if (error) {
    console.error('[retry-strategies POST]', error);
    return apiError('INTERNAL_ERROR', '전략 생성에 실패했습니다.', 500);
  }

  return NextResponse.json({ data }, { status: 201 });
}
