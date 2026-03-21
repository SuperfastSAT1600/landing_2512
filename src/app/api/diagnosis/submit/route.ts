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
      testVersionId,
      startedAt,
      submittedAt,
      totalTimeSeconds,
      answers,
      confidenceLevels,
      flaggedQuestions,
      questionTimes,
      savedWords,
    } = body;

    // Validate required fields (studentEmail is optional — student may skip)
    if (!studentName || !testId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch token to get time_limit_minutes
    let timeLimitMinutes = 30;
    if (tokenId) {
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('diagnostic_access_tokens')
        .select('id, time_limit_minutes')
        .eq('id', tokenId)
        .eq('is_active', true)
        .single();

      if (tokenError || !tokenData) {
        console.warn('Token validation failed, saving result without token link');
      } else {
        timeLimitMinutes = tokenData.time_limit_minutes ?? 30;
      }
    }

    // Idempotency: reject duplicate submissions within 60 seconds
    const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from('diagnostic_test_results')
      .select('id')
      .eq('test_id', testId)
      .eq('student_email', studentEmail ?? '')
      .gte('created_at', sixtySecondsAgo)
      .limit(1);

    if (recent && recent.length > 0) {
      return NextResponse.json(
        { success: true, resultId: recent[0].id },
        { status: 200 }
      );
    }

    // Insert test result
    const { data: resultData, error: insertError } = await supabaseAdmin
      .from('diagnostic_test_results')
      .insert([
        {
          token_id: tokenId || null,
          student_email: studentEmail || null,
          student_name: studentName,
          test_id: testId,
          test_version_id: testVersionId || null,
          started_at: startedAt,
          submitted_at: submittedAt,
          total_time_seconds: totalTimeSeconds,
          time_limit_minutes: timeLimitMinutes,
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
