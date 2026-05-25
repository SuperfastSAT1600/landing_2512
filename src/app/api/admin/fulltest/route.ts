import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

const CURRICULUM_ID = 'ccec8c4b-e43d-4b8e-bb77-fc9487486ba8';

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. fulltest_submissions
  const { data: submissions, error } = await supabaseAdmin
    .from('fulltest_submissions')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 2. correct answers from SMS Supabase
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

  // 3. score each submission
  const results = (submissions ?? []).map((sub) => {
    const answers: Record<string, string> = sub.answers ?? {};
    let correct = 0;
    let total = 0;
    const detail: { unitId: string; submitted: string; correctAnswer: string | string[]; isCorrect: boolean; section: string }[] = [];

    Object.entries(answers).forEach(([unitId, submitted]) => {
      const meta = correctMap[unitId];
      if (!meta) return;
      total++;
      const correctAnswer = meta.correct_answer;
      const isCorrect = Array.isArray(correctAnswer)
        ? correctAnswer.map((a) => a.toLowerCase()).includes(submitted.toLowerCase())
        : submitted.toUpperCase() === String(correctAnswer).toUpperCase();
      if (isCorrect) correct++;
      detail.push({ unitId, submitted, correctAnswer, isCorrect, section: meta.section });
    });

    const rwDetail = detail.filter((d) => d.section === 'reading_and_writing');
    const mathDetail = detail.filter((d) => d.section === 'math');

    return {
      id: sub.id,
      studentName: sub.student_name,
      submittedAt: sub.submitted_at,
      totalAnswered: total,
      totalUnits: units?.length ?? 0,
      correct,
      score: total > 0 ? Math.round((correct / total) * 100) : 0,
      rwCorrect: rwDetail.filter((d) => d.isCorrect).length,
      rwTotal: rwDetail.length,
      mathCorrect: mathDetail.filter((d) => d.isCorrect).length,
      mathTotal: mathDetail.length,
      detail,
    };
  });

  return NextResponse.json({ results });
}
