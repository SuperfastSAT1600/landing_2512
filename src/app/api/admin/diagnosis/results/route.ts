import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase';

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
        'id, student_email, student_name, submitted_at, total_time_seconds, test_id, answers, question_times',
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

    const results = (data || []).map((item) => ({
      id: item.id,
      student_email: item.student_email,
      student_name: item.student_name,
      submitted_at: item.submitted_at,
      total_time_seconds: item.total_time_seconds,
      test_id: item.test_id,
      answeredCount: Object.keys((item.answers as Record<string, string>) ?? {}).length,
      totalQuestions: Object.keys((item.question_times as Record<string, number>) ?? {}).length,
    }));

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
