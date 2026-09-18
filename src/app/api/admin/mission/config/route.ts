import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from('mission_config')
    .select('key, value')
    .eq('key', 'base_reps')
    .single();

  return NextResponse.json({ data: { base_reps: data?.value ?? 0 } });
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

  const base_reps = (body as { base_reps?: unknown }).base_reps;
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
