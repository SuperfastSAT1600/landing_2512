import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

const PostSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  instagram_url: z.string().url(),
  teacher_rep_count: z.number().int().positive().nullable().optional(),
});

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

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } }, { status: 400 });
  }

  const { date, instagram_url, teacher_rep_count } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from('mission_daily_posts')
    .upsert({ date, instagram_url, teacher_rep_count: teacher_rep_count ?? null, updated_at: new Date().toISOString() }, { onConflict: 'date' })
    .select()
    .single();

  if (error) {
    console.error('[admin/mission]', error);
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0];

  const { data } = await supabaseAdmin
    .from('mission_daily_posts')
    .select('*')
    .eq('date', date)
    .single();

  return NextResponse.json({ data: data ?? null });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: { code: 'MISSING_DATE' } }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('mission_daily_posts')
    .delete()
    .eq('date', date);

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ data: { deleted: true } });
}
