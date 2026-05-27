import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

const CURRICULUM_ID = 'ccec8c4b-e43d-4b8e-bb77-fc9487486ba8';

async function getFulltestResults() {
  const { data: submissions, error } = await supabaseAdmin
    .from('fulltest_submissions')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(error.message);

  const sms = createClient(
    process.env.SMS_SUPABASE_URL!,
    process.env.SMS_SUPABASE_SERVICE_KEY!,
  );
  const { data: units } = await sms
    .from('units')
    .select('id, correct_answer, type, section, scope_lesson_id')
    .eq('scope_curriculum_id', CURRICULUM_ID);

  const correctMap: Record<string, { correct_answer: string | string[]; type: string; section: string }> = {};
  (units ?? []).forEach((u) => {
    correctMap[u.id] = { correct_answer: u.correct_answer, type: u.type, section: u.section };
  });

  const submissions_result = (submissions ?? []).map((sub) => {
    const answers: Record<string, string> = sub.answers ?? {};
    let correct = 0;
    let total = 0;

    Object.entries(answers).forEach(([unitId, submitted]) => {
      const meta = correctMap[unitId];
      if (!meta) return;
      total++;
      const correctAnswer = meta.correct_answer;
      const isCorrect = Array.isArray(correctAnswer)
        ? correctAnswer.map((a) => a.toLowerCase()).includes(submitted.toLowerCase())
        : submitted.toUpperCase() === String(correctAnswer).toUpperCase();
      if (isCorrect) correct++;
    });

    return {
      id: sub.id,
      instagram_id: sub.instagram_id ?? null,
      studentName: sub.student_name,
      submittedAt: sub.submitted_at,
      totalAnswered: total,
      totalUnits: units?.length ?? 0,
      correct,
      score: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  });

  return { type: 'fulltest' as const, submissions: submissions_result };
}

async function getPracticeResults(testId: string) {
  const { data: submissions, error } = await supabaseAdmin
    .from('practice_submissions')
    .select('*')
    .eq('test_id', testId)
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(error.message);

  const submissions_result = (submissions ?? []).map((sub) => ({
    id: sub.id,
    instagram_id: sub.instagram_id,
    studentName: sub.student_name ?? null,
    submittedAt: sub.submitted_at,
    totalAnswered: sub.total_count,
    correct: sub.correct_count,
    score: sub.total_count > 0 ? Math.round((sub.correct_count / sub.total_count) * 100) : 0,
  }));

  return { type: 'practice' as const, testId, submissions: submissions_result };
}

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? 'fulltest';
  const testId = searchParams.get('testId') ?? 'june-2026-subskill-300';

  try {
    if (type === 'practice') {
      const result = await getPracticeResults(testId);
      return NextResponse.json(result);
    }
    const result = await getFulltestResults();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
