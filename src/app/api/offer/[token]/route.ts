import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { CoachOfferPayload, ConsultationEntry } from '@/types/crm';

/**
 * GET /api/offer/[token]
 * Returns coach offer view data using the offer_token as authentication.
 * No admin auth required — the token itself is the credential.
 */
export async function GET(
  _request: NextRequest,
  { params: _ptoken }: { params: Promise<{ token: string }> }
) {
  const { token } = await _ptoken;

  // Fetch assignment by token
  const { data: assignment, error: assignError } = await supabaseAdmin
    .from('student_coach_assignments')
    .select('*')
    .eq('offer_token', token)
    .single();

  if (assignError || !assignment) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
  }

  // Check expiry
  if (new Date(assignment.response_deadline) < new Date()) {
    return NextResponse.json({ error: 'Offer has expired' }, { status: 410 });
  }

  // Check already responded / closed
  if (assignment.status === 'closed') {
    return NextResponse.json({ error: 'Offer is closed' }, { status: 410 });
  }
  if (assignment.status === 'accepted' || assignment.status === 'rejected') {
    return NextResponse.json({ error: 'Offer already responded' }, { status: 409 });
  }

  // Fetch student — exclude sensitive fields (parent_phone, passcode_hash, timeline raw data)
  type StudentRow = {
    name: string;
    grade: string;
    school_type: import('@/types/crm').SchoolType;
    desired_subjects: import('@/types/crm').DesiredSubjects;
    previous_rw_score: number | null;
    previous_math_score: number | null;
    previous_score_status: import('@/types/crm').PreviousScoreStatus;
    target_score: number | null;
    target_test_date: string;
    ot_datetime: string | null;
    weekly_schedule: import('@/types/crm').WeeklySlot[] | null;
    consultation_timeline: ConsultationEntry[];
    diagnostic_result_id: string | null;
  };

  const { data: studentRaw, error: studentError } = await supabaseAdmin
    .from('students')
    .select(
      'name, grade, school_type, desired_subjects, previous_rw_score, previous_math_score, ' +
      'previous_score_status, target_score, target_test_date, ' +
      'ot_datetime, weekly_schedule, consultation_timeline, diagnostic_result_id'
    )
    .eq('id', assignment.student_id)
    .single();

  if (studentError || !studentRaw) {
    console.error('[offer GET] student fetch error:', studentError);
    return NextResponse.json({ error: 'Student data unavailable' }, { status: 500 });
  }

  const student = studentRaw as unknown as StudentRow;

  // Build coach_history from published timeline entries
  const timeline: ConsultationEntry[] = Array.isArray(student.consultation_timeline)
    ? student.consultation_timeline
    : [];

  const coachHistoryParts = timeline
    .filter((e) => e.published && e.ai_coach_history)
    .map((e) => e.ai_coach_history as string);

  const coachHistory = coachHistoryParts.length > 0 ? coachHistoryParts.join('\n\n') : null;

  // Count reviewing peers (pending offers for same student, excluding this one)
  const { count: reviewingCount } = await supabaseAdmin
    .from('student_coach_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', assignment.student_id)
    .eq('status', 'pending')
    .neq('offer_token', token);

  // Fetch diagnostic summary if available
  let diagnosticSummary = null;
  if (student.diagnostic_result_id) {
    const { data: diagResult } = await supabaseAdmin
      .from('diagnostic_test_results')
      .select('total_correct, total_questions, rw_score, math_score, weak_areas, vocab_weakness_level')
      .eq('id', student.diagnostic_result_id)
      .single();
    if (diagResult) {
      diagnosticSummary = diagResult as unknown as import('@/types/crm').DiagnosticSummary;
    }
  }

  const payload: CoachOfferPayload = {
    assignment_id: assignment.id,
    status: assignment.status,
    response_deadline: assignment.response_deadline,
    reviewing_count: reviewingCount ?? 0,
    student: {
      name: student.name,
      grade: student.grade,
      school_type: student.school_type,
      desired_subjects: student.desired_subjects,
      previous_rw_score: student.previous_rw_score,
      previous_math_score: student.previous_math_score,
      previous_score_status: student.previous_score_status,
      target_score: student.target_score,
      target_test_date: student.target_test_date,
      coach_history: coachHistory,
      diagnostic_summary: diagnosticSummary,
    },
    ot_datetime: student.ot_datetime,
    weekly_schedule: student.weekly_schedule,
  };

  return NextResponse.json({ data: payload });
}

/**
 * POST /api/offer/[token]
 * Coach responds to an offer.
 * Body: { action: 'accept' | 'reject' | 'consider', reason?: string, coach_timezone?: string }
 * No admin auth required — token is the credential.
 */
export async function POST(
  request: NextRequest,
  { params: _ptoken }: { params: Promise<{ token: string }> }
) {
  const { token } = await _ptoken;

  let body: { action: 'accept' | 'reject' | 'consider'; reason?: string; coach_timezone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, reason, coach_timezone } = body;

  if (!action || !['accept', 'reject', 'consider'].includes(action)) {
    return NextResponse.json(
      { error: "action must be 'accept', 'reject', or 'consider'" },
      { status: 400 }
    );
  }

  // Save coach_timezone if provided before calling RPC
  if (coach_timezone) {
    const { error: tzError } = await supabaseAdmin
      .from('student_coach_assignments')
      .update({ coach_timezone })
      .eq('offer_token', token);

    if (tzError) {
      console.warn('[offer POST] coach_timezone update failed:', tzError.message);
    }
  }

  // Call appropriate RPC
  let rpcResult: { data: unknown; error: unknown };

  if (action === 'accept') {
    rpcResult = await supabaseAdmin.rpc('accept_coach_offer', { p_offer_token: token });
  } else if (action === 'reject') {
    rpcResult = await supabaseAdmin.rpc('reject_coach_offer', {
      p_offer_token: token,
      p_reason: reason ?? null,
    });
  } else {
    rpcResult = await supabaseAdmin.rpc('consider_coach_offer', { p_offer_token: token });
  }

  if (rpcResult.error) {
    console.error('[offer POST] RPC error:', rpcResult.error);
    return NextResponse.json({ error: 'Failed to process offer response' }, { status: 500 });
  }

  const rpcData = rpcResult.data as { ok: boolean; reason?: string; assignment_id?: string };

  if (!rpcData?.ok) {
    const reason = rpcData?.reason;
    if (reason === 'offer_not_found_or_expired') {
      return NextResponse.json({ error: 'Offer not found or expired' }, { status: 410 });
    }
    if (reason === 'student_already_matched') {
      return NextResponse.json({ error: 'Student already matched with another coach' }, { status: 409 });
    }
    return NextResponse.json({ error: reason ?? 'Offer response failed' }, { status: 409 });
  }

  // On accept: update student matching_stage to 'matched'
  // NOTE: matching_stage column was omitted from migration 016; failure is non-fatal.
  if (action === 'accept') {
    const { data: assignment } = await supabaseAdmin
      .from('student_coach_assignments')
      .select('student_id')
      .eq('offer_token', token)
      .single();

    if (assignment?.student_id) {
      const { error: matchError } = await supabaseAdmin
        .from('students')
        .update({ matching_stage: 'matched' })
        .eq('id', assignment.student_id);

      if (matchError) {
        console.warn('[offer POST] matching_stage update failed:', matchError.message);
      }
    }
  }

  return NextResponse.json({ data: { action, ok: true } });
}
