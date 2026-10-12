import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const CUSTOM_PROBLEM_ID = 'rw-custom-submissions';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sat_problem_comments')
    .select('id, comment, created_at')
    .eq('problem_id', CUSTOM_PROBLEM_ID)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ words: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { word, instagram_username } = await request.json();
  if (!word?.trim()) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const comment = instagram_username
    ? `${word.trim()} (@${instagram_username.toLowerCase().trim()})`
    : word.trim();

  const { error } = await supabaseAdmin
    .from('sat_problem_comments')
    .insert({ problem_id: CUSTOM_PROBLEM_ID, comment });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { id, instagram_username } = await request.json();
  if (!id || !instagram_username) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const { data } = await supabaseAdmin
    .from('sat_problem_comments')
    .select('id, comment')
    .eq('id', id)
    .eq('problem_id', CUSTOM_PROBLEM_ID)
    .single();

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const expectedSuffix = `(@${instagram_username.toLowerCase().trim()})`;
  if (!data.comment.includes(expectedSuffix)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('sat_problem_comments')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
