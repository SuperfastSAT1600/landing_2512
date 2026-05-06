import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/diagnosis/results/[id]
 * Get detailed results for a specific test result
 * Admin-only endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Result ID is required' },
        { status: 400 }
      );
    }

    // Fetch the test result
    const { data, error } = await supabaseAdmin
      .from('diagnostic_test_results')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Test result not found' },
        { status: 404 }
      );
    }

    // Map snake_case DB fields to camelCase for frontend
    const result = {
      id: data.id,
      tokenId: data.token_id,
      studentEmail: data.student_email,
      studentName: data.student_name,
      testId: data.test_id,
      createdAt: data.created_at,
      startedAt: data.started_at,
      submittedAt: data.submitted_at,
      totalTimeSeconds: data.total_time_seconds,
      timeLimitMinutes: data.time_limit_minutes ?? undefined,
      answers: data.answers,
      confidenceLevels: data.confidence_levels,
      flaggedQuestions: data.flagged_questions,
      questionTimes: data.question_times,
      savedWords: data.saved_words,
      testVersionId: data.test_version_id ?? undefined,
      previousScoreStatus: data.previous_score_status ?? undefined,
      previousTestDate: data.previous_test_date ?? undefined,
      previousRwScore: data.previous_rw_score ?? undefined,
      previousMathScore: data.previous_math_score ?? undefined,
    };

    return NextResponse.json(
      {
        success: true,
        result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching result details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
