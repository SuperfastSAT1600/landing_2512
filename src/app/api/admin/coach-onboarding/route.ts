import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

// GET /api/admin/coach-onboarding
// ?coach_slug=xxx → 해당 코치의 최신 submission 반환
// (없으면) → 전체 목록 반환
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const coachSlug = request.nextUrl.searchParams.get('coach_slug');

  if (coachSlug) {
    // coach_slug로 invite 찾고 → 최신 submission 반환
    const { data: invite } = await supabaseAdmin
      .from('coach_onboarding_invites')
      .select('id')
      .eq('coach_slug', coachSlug)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!invite) {
      return NextResponse.json({ data: null });
    }

    const { data: submission } = await supabaseAdmin
      .from('coach_onboarding_submissions')
      .select('*')
      .eq('invite_id', invite.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ data: submission ?? null });
  }

  // 전체 목록
  const { data, error } = await supabaseAdmin
    .from('coach_onboarding_submissions')
    .select('id, name, completeness_score, head_coach_criteria_met, is_head_coach_eligible, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
