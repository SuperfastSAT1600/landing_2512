import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SubmitTestRequest, SubmitTestResponse } from '@/types/diagnosis';
import { notifyTestSubmission } from '@/lib/slack';

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
        .select('id, time_limit_minutes, is_active')
        .eq('id', tokenId)
        .single();

      if (tokenError || !tokenData) {
        console.warn('Token not found, saving result without token link');
      } else {
        timeLimitMinutes = tokenData.time_limit_minutes ?? 30;
      }
    }

    // Idempotency: if this token already has a result, return it without inserting
    if (tokenId) {
      const { data: existingByToken } = await supabaseAdmin
        .from('diagnostic_test_results')
        .select('id')
        .eq('token_id', tokenId)
        .limit(1)
        .single();

      if (existingByToken) {
        return NextResponse.json(
          { success: true, resultId: existingByToken.id },
          { status: 200 }
        );
      }
    }

    // Secondary guard: 같은 학생이 다른 토큰으로 재제출하는 것 방지 (30일 이내)
    if (studentName && testId) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existingByStudent } = await supabaseAdmin
        .from('diagnostic_test_results')
        .select('id')
        .eq('student_name', studentName)
        .eq('test_id', testId)
        .gte('submitted_at', thirtyDaysAgo)
        .limit(1)
        .maybeSingle();

      if (existingByStudent) {
        return NextResponse.json(
          { success: true, resultId: existingByStudent.id, isDuplicate: true },
          { status: 200 }
        );
      }
    }

    // Fallback idempotency for token-less submissions: reject duplicates within 10 minutes
    if (!tokenId && studentEmail) {
      const tenMinutesAgo = new Date(Date.now() - 600_000).toISOString();
      const { data: recent } = await supabaseAdmin
        .from('diagnostic_test_results')
        .select('id')
        .eq('test_id', testId)
        .eq('student_email', studentEmail)
        .gte('created_at', tenMinutesAgo)
        .limit(1);

      if (recent && recent.length > 0) {
        return NextResponse.json(
          { success: true, resultId: recent[0].id },
          { status: 200 }
        );
      }
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

    // Mark token as used (non-fatal if fails — result is already saved)
    if (tokenId) {
      const { error: tokenUpdateError } = await supabaseAdmin
        .from('diagnostic_access_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenId)
        .is('used_at', null);

      if (tokenUpdateError) {
        console.warn('Failed to mark token as used:', tokenUpdateError);
      }
    }

    // Slack 알림 (fire-and-forget — 실패해도 제출 응답에 영향 없음)
    notifyTestSubmission({
      studentName,
      studentEmail,
      submittedAt: submittedAt ?? new Date().toISOString(),
      resultId,
    }).catch((err) => console.error('[slack] submission notify failed:', err));

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
