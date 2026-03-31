import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * DELETE /api/admin/diagnosis/tokens/[id]
 * Soft-delete a token (is_active = false). Blocks if test result exists.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { data: token } = await supabaseAdmin
      .from('diagnostic_access_tokens')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const { data: result } = await supabaseAdmin
      .from('diagnostic_test_results')
      .select('id')
      .eq('token_id', id)
      .maybeSingle();

    if (result) {
      return NextResponse.json(
        { error: '시험 결과가 있는 코드는 삭제할 수 없습니다.' },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('diagnostic_access_tokens')
      .update({ is_active: false })
      .eq('id', id);

    if (updateError) {
      console.error('Error deleting token:', updateError);
      return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/diagnosis/tokens/[id]
 * Update expires_at for a token. Accepts { expiresAt: ISO string }.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { expiresAt } = body;

    if (!expiresAt) {
      return NextResponse.json({ error: 'expiresAt is required' }, { status: 400 });
    }

    const parsed = new Date(expiresAt);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const { data: token } = await supabaseAdmin
      .from('diagnostic_access_tokens')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('diagnostic_access_tokens')
      .update({ expires_at: parsed.toISOString() })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating token:', updateError);
      return NextResponse.json({ error: 'Failed to update token' }, { status: 500 });
    }

    return NextResponse.json({ success: true, expiresAt: parsed.toISOString() }, { status: 200 });
  } catch (error) {
    console.error('Error updating token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
