import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { VocabAnswer } from '@/types/diagnosis';
import { extractAttempts } from '@/lib/diagnosis-attempts';
import { loadComboContext, questionsForResult } from '@/lib/diagnosis-combo-data';

/**
 * GET /api/admin/diagnosis/results
 * Get list of diagnostic test results with optional filtering
 * Admin-only endpoint
 */
export async function GET(request: NextRequest) {
  // Verify admin authentication
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabaseAdmin
      .from('diagnostic_test_results')
      .select(
        'id, student_email, student_name, submitted_at, total_time_seconds, test_id, test_version_id, answers, confidence_levels, question_times, slack_sent_at, slack_error',
        { count: 'exact' }
      )
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply search filter
    if (search) {
      query = query.or(
        `student_name.ilike.%${search}%,student_email.ilike.%${search}%`
      );
    }

    // Apply date range filter
    if (dateFrom) {
      query = query.gte('submitted_at', dateFrom);
    }
    if (dateTo) {
      const nextDay = new Date(dateTo);
      nextDay.setDate(nextDay.getDate() + 1);
      query = query.lt('submitted_at', nextDay.toISOString());
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching results:', error);
      return NextResponse.json(
        { error: 'Failed to fetch results' },
        { status: 500 }
      );
    }

    const ctx = await loadComboContext();

    const results = (data || []).map((item) => {
      const rawAnswers = (item.answers as Record<string, unknown>) ?? {};
      const isV2 = rawAnswers.__v2__ === true;
      const attempts = extractAttempts(item, questionsForResult(item, ctx), ctx.pool);
      const vocab = isV2 ? ((rawAnswers.vocab as VocabAnswer[]) ?? []) : undefined;

      return {
        id: item.id,
        student_email: item.student_email,
        student_name: item.student_name,
        submitted_at: item.submitted_at,
        total_time_seconds: item.total_time_seconds,
        test_id: item.test_id,
        answeredCount: attempts.filter((a) => a.answered).length,
        totalQuestions: attempts.length,
        correctCount: attempts.filter((a) => a.isCorrect).length,
        vocabAnsweredCount: vocab?.length,
        vocabCorrectCount: vocab?.filter((v) => v.isCorrect).length,
        slack_sent_at: item.slack_sent_at ?? null,
        slack_error: item.slack_error ?? null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        results,
        total: count || 0,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in results endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
