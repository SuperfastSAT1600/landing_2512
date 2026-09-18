import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export interface OutcomeSummary {
  good_completed: number;
  bad_completed: number;
  unclassified_completed: number;
  good_dropped: number;
  bad_dropped: number;
  unclassified_dropped: number;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  const sp = new URL(request.url).searchParams;
  const from = sp.get('from');
  const to = sp.get('to');

  let query = supabaseAdmin
    .from('renewal_targets')
    .select('stage, outcome_quality')
    .in('stage', ['4', '5']);

  if (from) query = query.gte('week_start', from);
  if (to) query = query.lte('week_start', to);

  const { data, error } = await query;

  if (error) {
    console.error('[renewal-targets/outcomes GET]', error);
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: '데이터를 불러오지 못했습니다.' } },
      { status: 500 }
    );
  }

  const summary: OutcomeSummary = {
    good_completed: 0,
    bad_completed: 0,
    unclassified_completed: 0,
    good_dropped: 0,
    bad_dropped: 0,
    unclassified_dropped: 0,
  };

  for (const row of (data ?? []) as { stage: string; outcome_quality: string | null }[]) {
    if (row.stage === '4') {
      if (row.outcome_quality === 'good') summary.good_completed += 1;
      else if (row.outcome_quality === 'bad') summary.bad_completed += 1;
      else summary.unclassified_completed += 1;
    } else if (row.stage === '5') {
      if (row.outcome_quality === 'good') summary.good_dropped += 1;
      else if (row.outcome_quality === 'bad') summary.bad_dropped += 1;
      else summary.unclassified_dropped += 1;
    }
  }

  return NextResponse.json({ data: summary });
}
