import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  calculateCompletenessScore,
  calculateHeadCoachCriteria,
  countCriteriaMet,
  HEAD_COACH_ELIGIBLE_THRESHOLD,
} from '@/lib/coach-onboarding-score';
import type { CoachOnboardingSubmission } from '@/types/coach-onboarding';

// POST /api/coach-onboarding/submit
// Public (token-authenticated): submit onboarding form
export async function POST(request: NextRequest) {
  let body: { token: string; data: Omit<CoachOnboardingSubmission, 'id' | 'invite_id' | 'completeness_score' | 'head_coach_criteria' | 'head_coach_criteria_met' | 'is_head_coach_eligible' | 'status' | 'reviewed_at' | 'reviewed_by' | 'created_at'> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { token, data: formData } = body;
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  // Validate token
  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('coach_onboarding_invites')
    .select('id, expires_at, used_at')
    .eq('token', token)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (invite.used_at) {
    return NextResponse.json({ error: 'already_used' }, { status: 409 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  // Calculate scores
  const completeness_score = calculateCompletenessScore(formData);
  const head_coach_criteria = calculateHeadCoachCriteria(formData);
  const head_coach_criteria_met = countCriteriaMet(head_coach_criteria);
  const is_head_coach_eligible = head_coach_criteria_met >= HEAD_COACH_ELIGIBLE_THRESHOLD;

  // Insert submission
  const { data: submission, error: insertError } = await supabaseAdmin
    .from('coach_onboarding_submissions')
    .insert({
      invite_id: invite.id,
      ...formData,
      completeness_score,
      head_coach_criteria,
      head_coach_criteria_met,
      is_head_coach_eligible,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[submit POST]', insertError);
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
  }

  // Mark invite as used
  await supabaseAdmin
    .from('coach_onboarding_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id);

  return NextResponse.json({
    data: {
      id: submission.id,
      completeness_score,
      head_coach_criteria_met,
      is_head_coach_eligible,
    },
  });
}
