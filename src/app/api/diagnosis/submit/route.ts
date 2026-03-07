import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SubmitTestRequest, SubmitTestResponse } from '@/types/diagnosis';

/**
 * POST /api/diagnosis/submit
 * Submit test results and save to Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const body: SubmitTestRequest = await request.json();
    const {
      tokenId,
      studentEmail,
      studentName,
      testId,
      startedAt,
      submittedAt,
      totalTimeSeconds,
      answers,
      confidenceLevels,
      flaggedQuestions,
      questionTimes,
      savedWords,
    } = body;

    // Validate required fields
    if (!tokenId || !studentEmail || !studentName || !testId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify token exists and is valid
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('diagnostic_access_tokens')
      .select('id')
      .eq('id', tokenId)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Insert test result
    const { data: resultData, error: insertError } = await supabaseAdmin
      .from('diagnostic_test_results')
      .insert([
        {
          token_id: tokenId,
          student_email: studentEmail,
          student_name: studentName,
          test_id: testId,
          started_at: startedAt,
          submitted_at: submittedAt,
          total_time_seconds: totalTimeSeconds,
          answers: answers || {},
          confidence_levels: confidenceLevels || {},
          flagged_questions: flaggedQuestions || [],
          question_times: questionTimes || {},
          saved_words: savedWords || [],
        },
      ])
      .select('id');

    if (insertError) {
      console.error('Error inserting test result:', insertError);
      return NextResponse.json(
        { error: 'Failed to save test results' },
        { status: 500 }
      );
    }

    const resultId = resultData?.[0]?.id;

    if (!resultId) {
      return NextResponse.json(
        { error: 'Failed to create test result' },
        { status: 500 }
      );
    }

    const response: SubmitTestResponse = {
      success: true,
      resultId,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error submitting test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
