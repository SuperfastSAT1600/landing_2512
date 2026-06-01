import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const type = new URL(request.url).searchParams.get('type');

  let query = supabaseAdmin
    .from('retry_strategies')
    .select('*')
    .order('created_at', { ascending: true });

  if (type === 'initial' || type === 'retry') {
    query = query.eq('type', type);
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

  let body: { name: string; type?: 'initial' | 'retry' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: '전략 이름을 입력해주세요.' }, { status: 400 });
  }

  const strategyType = body.type === 'initial' ? 'initial' : 'retry';

  const { data, error } = await supabaseAdmin
    .from('retry_strategies')
    .insert({ name: body.name.trim(), type: strategyType })
    .select()
    .single();

  if (error) {
    console.error('[retry-strategies POST]', error);
    return NextResponse.json({ error: '전략 생성에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
