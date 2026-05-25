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

  // 후보 목록: student_id가 없거나 이미 이 학생에 연결된 것들, 최신 30개
  const { data: candidates } = await supabaseAdmin
    .from('diagnostic_test_results')
    .select('id, student_name, student_email, submitted_at, test_id, total_time_seconds')
    .or(`student_id.is.null,student_id.eq.${id}`)
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

  // resultId=null → 연결 해제
  if (resultId === null) {
    // 기존 연결 해제
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('diagnostic_result_id')
      .eq('id', id)
      .single();

    if (student?.diagnostic_result_id) {
      await supabaseAdmin
        .from('diagnostic_test_results')
        .update({ student_id: null })
        .eq('id', student.diagnostic_result_id);
    }

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

  // 기존 연결 해제 (이전 결과의 student_id 정리)
  const { data: currentStudent } = await supabaseAdmin
    .from('students')
    .select('diagnostic_result_id')
    .eq('id', id)
    .single();

  if (currentStudent?.diagnostic_result_id && currentStudent.diagnostic_result_id !== resultId) {
    await supabaseAdmin
      .from('diagnostic_test_results')
      .update({ student_id: null })
      .eq('id', currentStudent.diagnostic_result_id);
  }

  // 양방향 연결
  await Promise.all([
    supabaseAdmin.from('students').update({ diagnostic_result_id: resultId }).eq('id', id),
    supabaseAdmin.from('diagnostic_test_results').update({ student_id: id }).eq('id', resultId),
  ]);

  return NextResponse.json({ success: true });
}
