import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/diagnosis/validate-token
 * Validate a 6-digit access code and return student information
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'A valid 6-digit code is required' }, { status: 400 });
    }

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('diagnostic_access_tokens')
      .select('*')
      .eq('token', code)
      .eq('is_active', true)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
    }

    // Check expiration
    if (tokenData.expires_at) {
      if (new Date(tokenData.expires_at) < new Date()) {
        return NextResponse.json({ error: 'This code has expired' }, { status: 401 });
      }
    }

    // Check if already used
    if (tokenData.used_at) {
      return NextResponse.json({ error: '이미 사용된 코드입니다' }, { status: 401 });
    }

    // Resolve test version: use token's assigned version, or fall back to current
    let testVersionId: string | null = tokenData.test_version_id ?? null;
    if (!testVersionId) {
      const { data: currentVersion } = await supabaseAdmin
        .from('diagnostic_test_versions')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();
      testVersionId = currentVersion?.id ?? null;
    }

    return NextResponse.json({
      tokenId: tokenData.id,
      studentName: tokenData.student_name,
      expiresAt: tokenData.expires_at,
      testVersionId,
      timeLimitMinutes: tokenData.time_limit_minutes ?? 30,
    }, { status: 200 });
  } catch (error) {
    console.error('Error validating code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
