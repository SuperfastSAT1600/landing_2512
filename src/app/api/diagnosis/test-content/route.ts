import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import diagnosticTest1 from '@/app/diagnosis/data/diagnostic-test-1';
import diagnosticTest2 from '@/app/diagnosis/data/diagnostic-test-2';

/**
 * GET /api/diagnosis/test-content?versionId=<uuid>
 * Returns the full test data (questions, directions, etc.) for a given version.
 * Falls back to the hardcoded test when versionId is absent or not found in DB.
 * Public endpoint — no auth required (versionId is obtained from validated token).
 */
const HARDCODED_TESTS: Record<string, typeof diagnosticTest1> = {
  'diagnostic-test-1': diagnosticTest1,
  'diagnostic-test-2': diagnosticTest2,
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get('versionId');
  const testId = searchParams.get('testId') ?? 'diagnostic-test-1';
  const fallbackTest = HARDCODED_TESTS[testId] ?? diagnosticTest1;

  if (versionId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('diagnostic_test_versions')
        .select('id, version_number, title, time_limit_minutes, directions, questions')
        .eq('id', versionId)
        .single();

      if (!error && data && Array.isArray(data.questions) && data.questions.length > 0) {
        const dbQuestions = data.questions as Array<{ section?: string }>;
        const hasRW = dbQuestions.some(q => q.section === 'Reading and Writing');
        return NextResponse.json({
          id: data.id,
          versionNumber: data.version_number,
          title: data.title,
          timeLimit: data.time_limit_minutes,
          directions: data.directions,
          // DB version이 RW 문제 없으면 하드코딩 전체 세트로 폴백
          questions: hasRW ? data.questions : fallbackTest.questions,
        }, { status: 200 });
      }
    } catch (err) {
      console.error('Error fetching test version, falling back to default:', err);
    }
  }

  // Fallback: return hardcoded test data
  return NextResponse.json({
    id: fallbackTest.id,
    versionNumber: 1,
    title: fallbackTest.title,
    timeLimit: fallbackTest.timeLimit,
    directions: fallbackTest.directions,
    questions: fallbackTest.questions,
  }, { status: 200 });
}
