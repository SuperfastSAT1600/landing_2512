import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { buildQuestionStats } from '@/lib/diagnosis-analysis';
import type { TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';

/**
 * GET /api/admin/diagnosis/question-stats?versionId=<uuid>
 * Returns per-question statistics for a specific test version.
 * If versionId is omitted, uses the current version.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');

    // Resolve which version to use
    let resolvedVersionId = versionId;
    let questions: TestQuestion[];

    if (resolvedVersionId) {
      const { data: version, error } = await supabaseAdmin
        .from('diagnostic_test_versions')
        .select('questions')
        .eq('id', resolvedVersionId)
        .single();
      if (error || !version) {
        return NextResponse.json({ error: 'Version not found' }, { status: 404 });
      }
      questions = version.questions as TestQuestion[];
    } else {
      // Fall back to current version
      const { data: current, error } = await supabaseAdmin
        .from('diagnostic_test_versions')
        .select('id, questions')
        .eq('is_current', true)
        .maybeSingle();
      if (error || !current) {
        return NextResponse.json({ stats: [], totalResults: 0 }, { status: 200 });
      }
      resolvedVersionId = current.id;
      questions = current.questions as TestQuestion[];
    }

    // Fetch results for this version (by test_version_id, or by legacy test_id for v1)
    const { data, error: resultsError } = await supabaseAdmin
      .from('diagnostic_test_results')
      .select('answers, confidence_levels, question_times')
      .eq('test_version_id', resolvedVersionId);

    if (resultsError) throw resultsError;

    const results = data ?? [];
    const stats = buildQuestionStats(results, questions);

    return NextResponse.json({ stats, totalResults: results.length, versionId: resolvedVersionId }, { status: 200 });
  } catch (err) {
    console.error('Error computing question stats:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
