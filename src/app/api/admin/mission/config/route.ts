import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from('mission_config')
    .select('key, value, value_text')
    .in('key', ['base_reps', 'mission_title']);

  const rows = data ?? [];
  const base_reps = rows.find(r => r.key === 'base_reps')?.value ?? 0;
  const mission_title = rows.find(r => r.key === 'mission_title')?.value_text ?? '10월 SAT 미션';

  return NextResponse.json({ data: { base_reps, mission_title } });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON' } }, { status: 400 });
  }

  const b = body as { base_reps?: unknown; mission_title?: unknown };

  if (b.base_reps !== undefined) {
    const base_reps = b.base_reps;
    if (typeof base_reps !== 'number' || base_reps < 0) {
      return NextResponse.json({ error: { code: 'INVALID_VALUE' } }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from('mission_config')
      .upsert({ key: 'base_reps', value: base_reps, updated_at: new Date().toISOString() });
    if (error) {
      return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
    }
    return NextResponse.json({ data: { base_reps } });
  }

  if (b.mission_title !== undefined) {
    const mission_title = b.mission_title;
    if (typeof mission_title !== 'string' || !mission_title.trim()) {
      return NextResponse.json({ error: { code: 'INVALID_VALUE' } }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from('mission_config')
      .upsert({ key: 'mission_title', value: 0, value_text: mission_title.trim(), updated_at: new Date().toISOString() });
    if (error) {
      return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
    }
    return NextResponse.json({ data: { mission_title: mission_title.trim() } });
  }

  return NextResponse.json({ error: { code: 'INVALID_BODY' } }, { status: 400 });
}
