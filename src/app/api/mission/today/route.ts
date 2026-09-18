import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0];

  const [postResult, submissionsResult, totalResult] = await Promise.all([
    supabaseAdmin
      .from('mission_daily_posts')
      .select('*')
      .eq('date', date)
      .single(),
    supabaseAdmin
      .from('mission_submissions')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('mission_submissions')
      .select('rep_count'),
  ]);

  const totalReps = (totalResult.data ?? []).reduce((sum, r) => sum + (r.rep_count as number), 0);

  return NextResponse.json({
    data: {
      post: postResult.data ?? null,
      submissions: submissionsResult.data ?? [],
      totalReps,
    },
  });
}
