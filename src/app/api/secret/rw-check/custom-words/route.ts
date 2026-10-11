import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const CUSTOM_PROBLEM_ID = 'rw-custom-submissions';

// GET: 제출된 커스텀 단어 목록
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

// POST: 커스텀 단어 제출
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
