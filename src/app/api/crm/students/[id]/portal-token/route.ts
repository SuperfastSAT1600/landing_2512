import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { randomBytes } from 'crypto';

/**
 * POST /api/crm/students/[id]/portal-token
 * Returns existing portal_token or generates a new one.
 * Requires admin authentication.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: student, error: fetchError } = await supabaseAdmin
    .from('students')
    .select('id, portal_token')
    .eq('id', id)
    .single();

  if (fetchError || !student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  if (student.portal_token) {
    return NextResponse.json({ portal_token: student.portal_token });
  }

  const token = randomBytes(16).toString('hex');

  const { error: updateError } = await supabaseAdmin
    .from('students')
    .update({ portal_token: token })
    .eq('id', id);

  if (updateError) {
    console.error('[portal-token POST]', updateError);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }

  return NextResponse.json({ portal_token: token }, { status: 201 });
}
