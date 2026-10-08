import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET: 특정 문제의 코멘트 목록
export async function GET(request: NextRequest) {
  const problemId = new URL(request.url).searchParams.get('problemId');
  if (!problemId) return NextResponse.json({ comments: [] });

  const { data, error } = await supabaseAdmin
    .from('sat_problem_comments')
    .select('id, comment, created_at')
    .eq('problem_id', problemId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}

// POST: 코멘트 등록
export async function POST(request: NextRequest) {
  const { problem_id, comment } = await request.json();
  if (!problem_id || !comment?.trim()) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('sat_problem_comments')
    .insert({ problem_id, comment: comment.trim() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
