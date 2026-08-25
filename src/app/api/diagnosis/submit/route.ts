import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SubmitTestRequest, SubmitTestResponse } from '@/types/diagnosis';
import { notifyTestSubmission } from '@/lib/slack';
import { logLeadEvent } from '@/lib/lead-events';

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
      previousScoreStatus,
      previousTestDate,
      previousRwScore,
      previousMathScore,
    } = body;

    // Validate required fields (studentEmail is optional — student may skip)
    if (!studentName || !testId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch token to get time_limit_minutes (+ CRM에서 지정한 리드 id)
    let timeLimitMinutes = 30;
    let tokenStudentId: string | null = null;
    if (tokenId) {
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('diagnostic_access_tokens')
        .select('id, time_limit_minutes, is_active, student_id')
        .eq('id', tokenId)
        .single();

      if (tokenError || !tokenData) {
        console.warn('Token not found, saving result without token link');
      } else {
        timeLimitMinutes = tokenData.time_limit_minutes ?? 30;
        tokenStudentId = tokenData.student_id ?? null;
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
          previous_score_status: previousScoreStatus ?? null,
          previous_test_date: previousTestDate ?? null,
          previous_rw_score: previousRwScore ?? null,
          previous_math_score: previousMathScore ?? null,
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

    // 토큰에 리드가 지정돼 있으면 결정적 자동 연결 (ARGOSS Phase 1, REQ-003a).
    // funnel_stage 등 세일즈 단계는 건드리지 않는다 — 연결과 이벤트 기록만.
    if (tokenStudentId) {
      try {
        await supabaseAdmin
          .from('diagnostic_test_results')
          .update({ student_id: tokenStudentId })
          .eq('id', resultId);

        // 이미 연결된 결과가 있으면 절대 덮어쓰지 않음
        const { data: linkedStudent } = await supabaseAdmin
          .from('students')
          .select('diagnostic_result_id')
          .eq('id', tokenStudentId)
          .single();

        if (linkedStudent && !linkedStudent.diagnostic_result_id) {
          await supabaseAdmin
            .from('students')
            .update({ diagnostic_result_id: resultId })
            .eq('id', tokenStudentId);
        }

        await logLeadEvent(tokenStudentId, 'diagnostic_submitted', {
          metadata: { matched_by: 'token', result_id: resultId },
        });
      } catch (err) {
        console.warn('[submit] auto-link failed (result saved):', err);
      }
    }

    // Slack 알림 — await로 실행 (Vercel 서버리스는 return 후 비동기 작업을 죽임)
    // 성공/실패 여부를 DB에 기록해 Vercel 로그 없이도 추적 가능하게 함
    try {
      await notifyTestSubmission({
        studentName,
        studentEmail,
        submittedAt: submittedAt ?? new Date().toISOString(),
        resultId,
      });
      await supabaseAdmin
        .from('diagnostic_test_results')
        .update({ slack_sent_at: new Date().toISOString(), slack_error: null })
        .eq('id', resultId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[slack] submission notify failed:', errMsg);
      await supabaseAdmin
        .from('diagnostic_test_results')
        .update({ slack_sent_at: null, slack_error: errMsg })
        .eq('id', resultId);
      // Slack 실패는 제출 응답에 영향 없음
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
