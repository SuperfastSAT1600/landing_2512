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

/**
 * PATCH /api/admin/diagnosis/results/[id]
 * Update student_name on the result and cascade to the linked token
 * Accepts { studentName: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { studentName } = body;

    if (studentName === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const trimmed = studentName.trim();
    if (!trimmed) {
      return NextResponse.json({ error: '학생명은 비워둘 수 없습니다.' }, { status: 400 });
    }

    // Fetch token_id for reverse cascade
    const { data: resultRow } = await supabaseAdmin
      .from('diagnostic_test_results')
      .select('id, token_id')
      .eq('id', id)
      .single();

    if (!resultRow) {
      return NextResponse.json({ error: 'Test result not found' }, { status: 404 });
    }

    // Update result
    const { error: resultUpdateError } = await supabaseAdmin
      .from('diagnostic_test_results')
      .update({ student_name: trimmed })
      .eq('id', id);

    if (resultUpdateError) {
      console.error('Error updating result student_name:', resultUpdateError);
      return NextResponse.json({ error: 'Failed to update student name' }, { status: 500 });
    }

    // Cascade to token (if FK present — includes soft-deleted tokens)
    if (resultRow.token_id) {
      const { error: tokenCascadeError } = await supabaseAdmin
        .from('diagnostic_access_tokens')
        .update({ student_name: trimmed })
        .eq('id', resultRow.token_id);

      if (tokenCascadeError) {
        console.error('Non-fatal: failed to cascade student_name to token:', tokenCascadeError);
      }
    }

    return NextResponse.json({ success: true, studentName: trimmed }, { status: 200 });
  } catch (error) {
    console.error('Error updating result:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
