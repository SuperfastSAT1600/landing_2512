import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/admin/diagnosis/versions
 * 전체 문제 세트를 set_number ASC 정렬로 반환. testId 파라미터 무시.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: existing, error: listError } = await supabaseAdmin
      .from('diagnostic_test_versions')
      .select('id, set_number, version_number, title, time_limit_minutes, is_current, created_at, created_from, test_id')
      .order('set_number', { ascending: true });

    if (listError) throw listError;

    // Add question count for each version
    const versions = await Promise.all(
      (existing ?? []).map(async (v) => {
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
 * 기존 문제 세트 기반으로 새 문제 세트 생성 (질문 1개 교체).
 * set_number = MAX(set_number) + 1 전역 부여. test_id 저장 안 함.
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

    // Replace the edited question
    const questions = (base.questions as object[]).map((q: object) => {
      const question = q as { id: string };
      return question.id === editedQuestion.id ? editedQuestion : q;
    });

    // Get next global set_number
    const { data: maxRow } = await supabaseAdmin
      .from('diagnostic_test_versions')
      .select('set_number')
      .order('set_number', { ascending: false })
      .limit(1)
      .single();

    const nextSetNumber = (maxRow?.set_number ?? 0) + 1;

    const { data: newVersion, error: insertError } = await supabaseAdmin
      .from('diagnostic_test_versions')
      .insert({
        set_number: nextSetNumber,
        version_number: (base.version_number ?? 0) + 1,
        title: base.title,
        time_limit_minutes: base.time_limit_minutes,
        directions: base.directions,
        questions,
        is_current: false,
        created_from: baseVersionId,
        test_id: null,
      })
      .select('id, set_number, version_number, title, is_current, created_at')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ version: newVersion }, { status: 201 });
  } catch (err) {
    console.error('Error creating version:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
