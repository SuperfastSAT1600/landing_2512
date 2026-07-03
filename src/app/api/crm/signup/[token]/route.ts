import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isBridgeAuthenticated, mapStudentToPrefill } from '@/lib/signup-bridge';
import { logLeadEvent, LEAD_EVENT_DEDUP_MINUTES } from '@/lib/lead-events';

/**
 * GET /api/crm/signup/[token]
 * Called server-side by the platform's tutoring signup page. Returns the
 * prefill payload for a valid, unconsumed token. Gated by SIGNUP_BRIDGE_SECRET.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!isBridgeAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .select(
      'id, name, contact_type, parent_phone, parent_timezone, previous_score_status, previous_rw_score, previous_math_score, previous_test_date, target_test_date, signup_done_at'
    )
    .eq('signup_token', token)
    .maybeSingle();

  if (error) {
    console.error('[signup GET]', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!student) {
    return NextResponse.json({ status: 'invalid' }, { status: 404 });
  }
  if (student.signup_done_at) {
    return NextResponse.json({ status: 'consumed' }, { status: 409 });
  }

  // 플랫폼 가입 페이지가 로드될 때 서버측으로 호출되므로 이 요청 자체가 "링크 클릭" 신호
  await logLeadEvent(student.id, 'signup_link_clicked', {
    dedupMinutes: LEAD_EVENT_DEDUP_MINUTES,
  });

  return NextResponse.json({
    status: 'valid',
    studentId: student.id,
    prefill: mapStudentToPrefill(student),
  });
}
