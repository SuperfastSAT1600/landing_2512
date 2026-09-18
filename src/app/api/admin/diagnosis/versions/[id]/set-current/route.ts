import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * PATCH /api/admin/diagnosis/versions/[id]/set-current
 * 전역 기본 문제 세트를 변경. 모든 문제 세트에서 is_current를 해제 후 지정.
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
    // Clear is_current globally
    const { error: clearError } = await supabaseAdmin
      .from('diagnostic_test_versions')
      .update({ is_current: false })
      .eq('is_current', true);

    if (clearError) throw clearError;

    // Set the selected version as current
    const { data, error: setError } = await supabaseAdmin
      .from('diagnostic_test_versions')
      .update({ is_current: true })
      .eq('id', id)
      .select('id, set_number, version_number, is_current')
      .single();

    if (setError || !data) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    return NextResponse.json({ version: data }, { status: 200 });
  } catch (err) {
    console.error('Error setting current version:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
