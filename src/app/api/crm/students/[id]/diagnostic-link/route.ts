import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

/**
 * GET  — 현재 연결된 결과 + 연결 가능한 후보 목록 반환
 * POST — 특정 결과를 이 학생에 연결 (양방향 업데이트)
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: student } = await supabaseAdmin
    .from('students')
    .select('name, diagnostic_result_id')
    .eq('id', id)
    .single();

  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // 현재 연결된 결과
  let linked = null;
  if (student.diagnostic_result_id) {
    const { data } = await supabaseAdmin
      .from('diagnostic_test_results')
      .select('id, student_name, student_email, submitted_at, test_id, total_time_seconds')
      .eq('id', student.diagnostic_result_id)
      .single();
    linked = data;
  }

  // 후보 목록: 한 번도 연결된 적 없는 결과만 (student_id IS NULL)
  const { data: candidates } = await supabaseAdmin
    .from('diagnostic_test_results')
    .select('id, student_name, student_email, submitted_at, test_id, total_time_seconds')
    .is('student_id', null)
    .order('submitted_at', { ascending: false })
    .limit(30);

  return NextResponse.json({ linked, candidates: candidates ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const resultId: string | null = body?.resultId ?? null;

  // resultId=null → 연결 해제 (student_id는 유지 — 한 번 연결된 결과는 후보에서 영구 제외)
  if (resultId === null) {
    await supabaseAdmin
      .from('students')
      .update({ diagnostic_result_id: null })
      .eq('id', id);

    return NextResponse.json({ success: true });
  }

  // 결과가 존재하는지 확인
  const { data: result } = await supabaseAdmin
    .from('diagnostic_test_results')
    .select('id')
    .eq('id', resultId)
    .single();

  if (!result) return NextResponse.json({ error: 'Result not found' }, { status: 404 });

  // 이전 결과의 student_id는 유지 (한 번 연결된 결과는 후보에서 영구 제외)
  // 양방향 연결
  await Promise.all([
    supabaseAdmin.from('students').update({ diagnostic_result_id: resultId }).eq('id', id),
    supabaseAdmin.from('diagnostic_test_results').update({ student_id: id }).eq('id', resultId),
  ]);

  return NextResponse.json({ success: true });
}
