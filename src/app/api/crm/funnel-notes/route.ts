import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

const STAGE_KEYS = ['lead', 'call', 'diagnostic', 'report', 'paid'];

// GET /api/crm/funnel-notes?source=<traffic_source|__all__>
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const source = request.nextUrl.searchParams.get('source');
  if (!source) return NextResponse.json({ error: 'source가 필요합니다.' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('funnel_notes')
    .select('*')
    .eq('source', source)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[funnel-notes GET]', error);
    return NextResponse.json({ error: '주석을 불러오지 못했습니다.' }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// POST /api/crm/funnel-notes
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: { source?: string; stage_key?: string; week_start?: string | null; content?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.source || !body.stage_key || !STAGE_KEYS.includes(body.stage_key)) {
    return NextResponse.json({ error: 'source/stage_key가 올바르지 않습니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('funnel_notes')
    .insert({
      source: body.source,
      stage_key: body.stage_key,
      week_start: body.week_start || null,
      content: body.content ?? '',
    })
    .select()
    .single();

  if (error) {
    console.error('[funnel-notes POST]', error);
    return NextResponse.json({ error: '주석 생성에 실패했습니다.' }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
