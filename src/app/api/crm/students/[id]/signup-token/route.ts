import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { buildSignupUrl } from '@/lib/signup-bridge';
import { randomBytes } from 'crypto';

/**
 * POST /api/crm/students/[id]/signup-token
 * Issues (or returns the existing) tutoring-signup token for a student and the
 * full platform signup link. Admin-authenticated (called from the payment
 * modal's final step). Mirrors portal-token.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const base = process.env.SUPERFASTSAT_PLATFORM_URL;
  if (!base) {
    console.error('[signup-token] SUPERFASTSAT_PLATFORM_URL not configured');
    return NextResponse.json({ error: 'Signup link not configured' }, { status: 500 });
  }

  const { data: student, error: fetchError } = await supabaseAdmin
    .from('students')
    .select('id, signup_token')
    .eq('id', id)
    .single();

  if (fetchError || !student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  if (student.signup_token) {
    return NextResponse.json({
      signup_token: student.signup_token,
      signup_url: buildSignupUrl(base, student.signup_token),
    });
  }

  const token = randomBytes(16).toString('hex');

  const { error: updateError } = await supabaseAdmin
    .from('students')
    .update({ signup_token: token, signup_token_created_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) {
    console.error('[signup-token POST]', updateError);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }

  return NextResponse.json(
    { signup_token: token, signup_url: buildSignupUrl(base, token) },
    { status: 201 }
  );
}
