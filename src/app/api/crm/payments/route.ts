import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { enrollStudentOnPayment } from '@/lib/enroll-on-payment';
import { apiError, unauthorized } from '@/lib/api-response';

/**
 * GET  /api/crm/payments?student_id=xxx
 * POST /api/crm/payments
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return unauthorized();
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('student_id');
  const studentName = searchParams.get('student_name');
  if (studentName && /[,().]/.test(studentName)) {
    return apiError('INVALID_PARAM', '요청 파라미터가 올바르지 않습니다.', 400);
  }
  let query = supabaseAdmin.from('payments').select('*').order('paid_at', { ascending: false });
  if (studentId && studentName) {
    query = query.or(`student_id.eq.${studentId},and(student_id.is.null,student_name.eq.${studentName})`);
  } else if (studentId) {
    query = query.eq('student_id', studentId);
  }

  const { data, error } = await query;
  if (error) return apiError('FETCH_FAILED', error.message, 500);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) return unauthorized();

  let body: {
    student_id?: string;
    student_name: string;
    coach_name?: string;
    amount: number;
    payment_type: string;
    payment_method?: string | null;
    plan_duration?: string;
    plan_subjects?: string;
    paid_at: string;
    notes?: string;
    created_by?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', '요청 본문이 올바른 JSON이 아닙니다.', 400);
  }

  // amount는 0(가결제)도 유효하므로 falsy가 아닌 타입으로 판정한다.
  if (!body.student_name || typeof body.amount !== 'number' || !Number.isFinite(body.amount) || !body.paid_at) {
    return apiError('MISSING_FIELDS', 'student_name, amount, paid_at는 필수입니다.', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert({
      student_id: body.student_id ?? null,
      student_name: body.student_name,
      coach_name: body.coach_name ?? null,
      amount: body.amount,
      payment_type: body.payment_type ?? '최초결제',
      // 모르는 결제수단에 '계좌이체'를 박지 않는다 — NULL이 "기록되지 않음"이다.
      payment_method: body.payment_method ?? null,
      plan_duration: body.plan_duration ?? null,
      plan_subjects: body.plan_subjects ?? null,
      paid_at: body.paid_at,
      notes: body.notes ?? null,
      created_by: body.created_by ?? null,
    })
    .select()
    .single();

  if (error) return apiError('INSERT_FAILED', error.message, 500);

  // 결제 → "수업 중" 전환. 학생이 연결돼 있고 환불이 아닐 때.
  // 0원 가결제도 수업 시작이므로 함께 전환한다.
  // 입력 경로와 무관하게 단계 전환을 보장한다(근본 원인 수정).
  if (body.student_id && body.amount >= 0 && body.payment_type !== '환불') {
    await enrollStudentOnPayment(body.student_id);
  }

  return NextResponse.json({ data }, { status: 201 });
}
