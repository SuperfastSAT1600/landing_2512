import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase';
import diagnosticTest1 from '@/app/diagnosis/data/diagnostic-test-1';

/**
 * GET /api/admin/diagnosis/versions
 * List all test versions, ordered by version_number desc.
 * Auto-seeds v1 from the hardcoded TS file if no versions exist.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: existing, error: listError } = await supabaseAdmin
      .from('diagnostic_test_versions')
      .select('id, version_number, title, time_limit_minutes, is_current, created_at, created_from')
      .order('version_number', { ascending: false });

    if (listError) throw listError;

    // Auto-seed v1 from the hardcoded TS file if no versions exist
    if (!existing || existing.length === 0) {
      const { data: seeded, error: seedError } = await supabaseAdmin
        .from('diagnostic_test_versions')
        .insert({
          version_number: 1,
          title: 'SAT Diagnostic Test',
          time_limit_minutes: diagnosticTest1.timeLimit,
          directions: diagnosticTest1.directions ?? null,
          questions: diagnosticTest1.questions,
          is_current: true,
        })
        .select('id, version_number, title, time_limit_minutes, is_current, created_at, created_from')
        .single();

      if (seedError) throw seedError;
      return NextResponse.json({ versions: [seeded] }, { status: 200 });
    }

    // Add question count for each version
    const versions = await Promise.all(
      existing.map(async (v) => {
        const { data: versionData } = await supabaseAdmin
          .from('diagnostic_test_versions')
          .select('questions')
          .eq('id', v.id)
          .single();
        const questionCount = Array.isArray(versionData?.questions)
          ? versionData.questions.length
          : 0;
        return { ...v, questionCount };
      })
    );

    return NextResponse.json({ versions }, { status: 200 });
  } catch (err) {
    console.error('Error listing versions:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/diagnosis/versions
 * Create a new version based on an existing one with one edited question.
 * Body: { baseVersionId: string, editedQuestion: TestQuestion }
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { baseVersionId, editedQuestion } = await request.json();

    if (!baseVersionId || !editedQuestion) {
      return NextResponse.json(
        { error: 'baseVersionId and editedQuestion are required' },
        { status: 400 }
      );
    }

    // Fetch base version
    const { data: base, error: baseError } = await supabaseAdmin
      .from('diagnostic_test_versions')
      .select('version_number, title, time_limit_minutes, directions, questions')
      .eq('id', baseVersionId)
      .single();

    if (baseError || !base) {
      return NextResponse.json({ error: 'Base version not found' }, { status: 404 });
    }

    // Replace the edited question in the questions array
    const questions = (base.questions as object[]).map((q: object) => {
      const question = q as { id: string };
      return question.id === editedQuestion.id ? editedQuestion : q;
    });

    // Get next version number
    const { data: maxRow } = await supabaseAdmin
      .from('diagnostic_test_versions')
      .select('version_number')
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const nextVersionNumber = (maxRow?.version_number ?? 0) + 1;

    const { data: newVersion, error: insertError } = await supabaseAdmin
      .from('diagnostic_test_versions')
      .insert({
        version_number: nextVersionNumber,
        title: base.title,
        time_limit_minutes: base.time_limit_minutes,
        directions: base.directions,
        questions,
        is_current: false,
        created_from: baseVersionId,
      })
      .select('id, version_number, title, is_current, created_at')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ version: newVersion }, { status: 201 });
  } catch (err) {
    console.error('Error creating version:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
