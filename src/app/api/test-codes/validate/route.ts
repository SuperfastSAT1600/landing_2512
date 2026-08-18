import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type ErrorCode =
  | 'invalid_code'
  | 'code_inactive'
  | 'code_expired'
  | 'capacity_exceeded'
  | 'server_error';

function errorResponse(error: ErrorCode, status = 400) {
  return NextResponse.json({ valid: false, error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, instagramId, testId } = body as {
      code?: string;
      instagramId?: string;
      testId?: string;
    };

    if (!code || !instagramId || !testId) {
      return errorResponse('invalid_code');
    }

    const normalizedCode = code.trim().toUpperCase();
    const normalizedIg = instagramId.trim().startsWith('@')
      ? instagramId.trim()
      : `@${instagramId.trim()}`;

    // Find code by (code, test_id)
    const { data: codeRow, error: codeError } = await supabaseAdmin
      .from('test_codes')
      .select('id, is_active, expires_at, max_uses')
      .eq('code', normalizedCode)
      .eq('test_id', testId)
      .single();

    if (codeError || !codeRow) {
      return errorResponse('invalid_code');
    }

    if (!codeRow.is_active) {
      return errorResponse('code_inactive');
    }

    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
      return errorResponse('code_expired');
    }

    // Check if returning user
    const { data: existingReg } = await supabaseAdmin
      .from('test_code_registrations')
      .select('id')
      .eq('code_id', codeRow.id)
      .eq('instagram_id', normalizedIg)
      .maybeSingle();

    if (existingReg) {
      return NextResponse.json({ valid: true, isReturning: true });
    }

    // Count current registrations
    const { count } = await supabaseAdmin
      .from('test_code_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('code_id', codeRow.id);

    if ((count ?? 0) >= codeRow.max_uses) {
      return errorResponse('capacity_exceeded');
    }

    // Insert registration, handle race condition (unique constraint violation = 23505)
    const { error: insertError } = await supabaseAdmin
      .from('test_code_registrations')
      .insert({ code_id: codeRow.id, instagram_id: normalizedIg });

    if (insertError) {
      if (insertError.code === '23505') {
        // Race condition: another request registered this user concurrently
        return NextResponse.json({ valid: true, isReturning: true });
      }
      return errorResponse('server_error', 500);
    }

    return NextResponse.json({ valid: true, isReturning: false });
  } catch {
    return errorResponse('server_error', 500);
  }
}
