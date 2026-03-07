import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ValidateTokenRequest, ValidateTokenResponse } from '@/types/diagnosis';

/**
 * POST /api/diagnosis/validate-token
 * Validate an access token and return student information
 */
export async function POST(request: NextRequest) {
  try {
    const body: ValidateTokenRequest = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required and must be a string' },
        { status: 400 }
      );
    }

    // Query the token from database
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('diagnostic_access_tokens')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if token has expired
    if (tokenData.expires_at) {
      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Token has expired' },
          { status: 401 }
        );
      }
    }

    // Record the first use of the token (used_at timestamp)
    if (!tokenData.used_at) {
      await supabaseAdmin
        .from('diagnostic_access_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id)
        .select();
    }

    // Return student information
    const response: ValidateTokenResponse = {
      tokenId: tokenData.id,
      studentEmail: tokenData.student_email,
      studentName: tokenData.student_name,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error validating token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
