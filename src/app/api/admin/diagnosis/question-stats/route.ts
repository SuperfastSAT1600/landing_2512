import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase';
import diagnosticTest1 from '@/app/diagnosis/data/diagnostic-test-1';
import { buildQuestionStats } from '@/lib/diagnosis-analysis';

/**
 * GET /api/admin/diagnosis/question-stats
 * Returns per-question statistics aggregated from all test results.
 * Admin-only endpoint.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('diagnostic_test_results')
      .select('answers, confidence_levels, question_times')
      .eq('test_id', diagnosticTest1.id);

    if (error) {
      console.error('Error fetching results for question stats:', error);
      return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
    }

    const results = data ?? [];
    const stats = buildQuestionStats(results, diagnosticTest1.questions);

    return NextResponse.json({ stats, totalResults: results.length }, { status: 200 });
  } catch (err) {
    console.error('Error computing question stats:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
