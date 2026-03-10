import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/diagnosis/test-content?versionId=<uuid>
 * Returns the full test data (questions, directions, etc.) for a given version.
 * Public endpoint — no auth required (versionId is obtained from validated token).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get('versionId');

  if (!versionId) {
    return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('diagnostic_test_versions')
      .select('id, version_number, title, time_limit_minutes, directions, questions')
      .eq('id', versionId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Test version not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      versionNumber: data.version_number,
      title: data.title,
      timeLimit: data.time_limit_minutes,
      directions: data.directions,
      questions: data.questions,
    }, { status: 200 });
  } catch (err) {
    console.error('Error fetching test content:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
