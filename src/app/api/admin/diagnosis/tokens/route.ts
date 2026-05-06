import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMetaCAPIEvent } from '@/lib/meta-capi';

/**
 * GET /api/admin/diagnosis/tokens
 * List all issued access codes with usage status
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all active codes ordered by creation date (soft-deleted excluded)
    const { data: codes, error: codesError } = await supabaseAdmin
      .from('diagnostic_access_tokens')
      .select('id, token, student_email, student_name, expires_at, is_active, created_at, test_version_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (codesError) {
      console.error('Error fetching codes:', codesError);
      return NextResponse.json({ error: 'Failed to fetch codes' }, { status: 500 });
    }

    // Fetch all result token_ids to determine usage
    const { data: results } = await supabaseAdmin
      .from('diagnostic_test_results')
      .select('token_id');

    const usedTokenIds = new Set((results || []).map(r => r.token_id).filter(Boolean));
    const now = new Date();

    const codesWithStatus = (codes || []).map(code => {
      let status: 'completed' | 'expired' | 'pending';
      if (usedTokenIds.has(code.id)) {
        status = 'completed';
      } else if (code.expires_at && new Date(code.expires_at) < now) {
        status = 'expired';
      } else {
        status = 'pending';
      }
      return { ...code, status };
    });

    return NextResponse.json({ codes: codesWithStatus }, { status: 200 });
  } catch (error) {
    console.error('Error listing codes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/diagnosis/tokens
 * Generate a new 6-digit access code for a student
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { studentName, studentPhone, code, expiresAt: expiresAtInput, testVersionId, timeLimitMinutes } = await request.json();

    if (!studentName || !code) {
      return NextResponse.json({ error: 'Student name and code are required' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Code must be exactly 6 digits' }, { status: 400 });
    }

    // Check if code is already active
    const { data: existing } = await supabaseAdmin
      .from('diagnostic_access_tokens')
      .select('id')
      .eq('token', code)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'This code is already in use' }, { status: 409 });
    }

    // 학생이 이미 완료한 결과가 있으면 경고 (토큰은 발급하되 warning 반환)
    const { data: existingResult } = await supabaseAdmin
      .from('diagnostic_test_results')
      .select('id, submitted_at')
      .eq('student_name', studentName)
      .eq('test_id', 'diagnostic-test-1')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Use provided expiresAt or default to 24 hours from now
    const expiresAt = expiresAtInput ? new Date(expiresAtInput) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Resolve version: use provided testVersionId or current version
    let resolvedVersionId = testVersionId ?? null;
    if (!resolvedVersionId) {
      const { data: current } = await supabaseAdmin
        .from('diagnostic_test_versions')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();
      resolvedVersionId = current?.id ?? null;
    }

    const { error: insertError } = await supabaseAdmin
      .from('diagnostic_access_tokens')
      .insert([{
        token: code,
        student_email: null,
        student_name: studentName,
        phone_number: studentPhone?.trim() || null,
        test_id: 'diagnostic-test-1',
        test_version_id: resolvedVersionId,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        time_limit_minutes: timeLimitMinutes && timeLimitMinutes > 0 ? timeLimitMinutes : 30,
      }]);

    if (insertError) {
      console.error('Error creating code:', insertError);
      return NextResponse.json({ error: 'Failed to create code' }, { status: 500 });
    }

    // Send CAPI event if phone number provided
    if (studentPhone?.trim()) {
      sendMetaCAPIEvent({
        eventName: 'DiagnosticCodeIssued',
        userData: {
          ph: studentPhone.trim(),
          fn: studentName.split(' ')[0],
        },
        customData: { content_name: 'diagnostic_code_issued' },
      }).catch(err => console.error('[tokens] CAPI error:', err));
    }

    return NextResponse.json({
      code,
      studentName,
      expiresAt: expiresAt.toISOString(),
      warning: existingResult
        ? `${studentName} 학생은 이미 진단테스트를 완료했습니다 (제출일: ${new Date(existingResult.submitted_at).toLocaleString('ko-KR')}). 새 코드 발급 시 중복 데이터가 생성될 수 있습니다.`
        : null,
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
