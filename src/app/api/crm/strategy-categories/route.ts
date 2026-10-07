import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const segment = new URL(request.url).searchParams.get('segment');
  if (segment !== 'b2c' && segment !== 'b2b') {
    return NextResponse.json({ error: 'segment(b2c|b2b)를 지정해주세요.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('strategy_categories')
    .select('*')
    .eq('segment', segment)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[strategy-categories GET]', error);
    return NextResponse.json({ error: '카테고리 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string; segment?: 'b2c' | 'b2b' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: '카테고리 이름을 입력해주세요.' }, { status: 400 });
  }
  if (body.segment !== 'b2c' && body.segment !== 'b2b') {
    return NextResponse.json({ error: 'segment(b2c|b2b)를 지정해주세요.' }, { status: 400 });
  }

  const { data: existing, error: maxError } = await supabaseAdmin
    .from('strategy_categories')
    .select('sort_order')
    .eq('segment', body.segment)
    .order('sort_order', { ascending: false })
    .limit(1);

  if (maxError) {
    console.error('[strategy-categories POST max]', maxError);
    return NextResponse.json({ error: '카테고리 생성에 실패했습니다.' }, { status: 500 });
  }

  const nextOrder = existing?.[0] ? (existing[0] as { sort_order: number }).sort_order + 1 : 0;

  const { data, error } = await supabaseAdmin
    .from('strategy_categories')
    .insert({ name: body.name.trim(), segment: body.segment, sort_order: nextOrder })
    .select()
    .single();

  if (error) {
    console.error('[strategy-categories POST]', error);
    return NextResponse.json({ error: '카테고리 생성에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
