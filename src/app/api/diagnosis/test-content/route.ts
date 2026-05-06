import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import diagnosticTest1 from '@/app/diagnosis/data/diagnostic-test-1';

/**
 * GET /api/diagnosis/test-content?versionId=<uuid>
 * Returns the full test data (questions, directions, etc.) for a given version.
 * Falls back to the hardcoded test when versionId is absent or not found in DB.
 * Public endpoint — no auth required (versionId is obtained from validated token).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get('versionId');

  if (versionId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('diagnostic_test_versions')
        .select('id, version_number, title, time_limit_minutes, directions, questions')
        .eq('id', versionId)
        .single();

      if (!error && data && Array.isArray(data.questions) && data.questions.length > 0) {
        return NextResponse.json({
          id: data.id,
          versionNumber: data.version_number,
          title: data.title,
          timeLimit: data.time_limit_minutes,
          directions: data.directions,
          questions: data.questions,
        }, { status: 200 });
      }
    } catch (err) {
      console.error('Error fetching test version, falling back to default:', err);
    }
  }

  // Fallback: return hardcoded test data
  return NextResponse.json({
    id: diagnosticTest1.id,
    versionNumber: 1,
    title: diagnosticTest1.title,
    timeLimit: diagnosticTest1.timeLimit,
    directions: diagnosticTest1.directions,
    questions: diagnosticTest1.questions,
  }, { status: 200 });
}
