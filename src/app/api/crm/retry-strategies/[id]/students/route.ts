import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { apiError, unauthorized } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) return unauthorized();

  let body: { student_id?: string; student_ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  // ── 단일 학생 ───────────────────────────────────────────────────────────────
  if (body.student_id) {
    const { data, error } = await supabaseAdmin
      .from('students')
      .update({ retry_strategy_id: id, retry_stage: '연락 시도', retry_assigned_at: new Date().toISOString() })
      .eq('id', body.student_id)
      .select()
      .single();

    if (error) {
      console.error('[retry-strategies/students POST]', error);
      return apiError('INTERNAL_ERROR', '학생 추가에 실패했습니다.', 500);
    }
    return NextResponse.json({ data }, { status: 201 });
  }

  // ── 일괄 배정 ────────────────────────────────────────────────────────────────
  if (Array.isArray(body.student_ids) && body.student_ids.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('students')
      .update({ retry_strategy_id: id, retry_stage: '연락 시도', retry_assigned_at: new Date().toISOString() })
      .in('id', body.student_ids)
      .select('id');

    if (error) {
      console.error('[retry-strategies/students bulk POST]', error);
      return apiError('INTERNAL_ERROR', '일괄 배정에 실패했습니다.', 500);
    }
    return NextResponse.json({ data, count: data?.length ?? 0 }, { status: 201 });
  }

  return apiError('BAD_REQUEST', 'student_id 또는 student_ids가 필요합니다.', 400);
}
