import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { GenerateTokenRequest, GenerateTokenResponse } from '@/types/diagnosis';

/**
 * POST /api/admin/diagnosis/tokens
 * Generate a new access token for a student
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  // Verify admin authentication
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body: GenerateTokenRequest = await request.json();
    const { studentEmail, studentName } = body;

    // Validate required fields
    if (!studentEmail || !studentName) {
      return NextResponse.json(
        { error: 'Student email and name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Generate unique token (UUID)
    const token = crypto.randomUUID();

    // Calculate expiration time: 24 hours from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    // Insert token record into database
    const { data: tokenData, error: insertError } = await supabaseAdmin
      .from('diagnostic_access_tokens')
      .insert([
        {
          token,
          student_email: studentEmail,
          student_name: studentName,
          test_id: 'diagnostic-test-1',
          expires_at: expiresAt.toISOString(),
          is_active: true,
        },
      ])
      .select('id');

    if (insertError) {
      console.error('Error creating token:', insertError);
      return NextResponse.json(
        { error: 'Failed to create token' },
        { status: 500 }
      );
    }

    const testUrl = `/diagnosis?token=${token}`;

    const response: GenerateTokenResponse = {
      token,
      studentEmail,
      studentName,
      expiresAt: expiresAt.toISOString(),
      testUrl,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
