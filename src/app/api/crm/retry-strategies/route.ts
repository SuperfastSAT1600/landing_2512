import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const type = sp.get('type');
  const segment = sp.get('segment');

  let query = supabaseAdmin
    .from('retry_strategies')
    .select('*')
    .order('created_at', { ascending: true });

  const validTypes = ['initial_contact', 'initial_sales', 'retry'];
  if (type && validTypes.includes(type)) {
    query = query.eq('type', type);
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

  let body: { name: string; type?: 'initial_contact' | 'initial_sales' | 'retry'; description?: string; segment?: 'b2c' | 'b2b' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: '전략 이름을 입력해주세요.' }, { status: 400 });
  }

  const validTypes = ['initial_contact', 'initial_sales', 'retry'];
  const strategyType = validTypes.includes(body.type ?? '') ? body.type : 'retry';
  const segment = body.segment === 'b2b' ? 'b2b' : 'b2c';

  const { data, error } = await supabaseAdmin
    .from('retry_strategies')
    .insert({ name: body.name.trim(), type: strategyType, description: body.description?.trim() || null, segment })
    .select()
    .single();

  if (error) {
    console.error('[retry-strategies POST]', error);
    return NextResponse.json({ error: '전략 생성에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
