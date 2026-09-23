import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const { unit_id, curriculum_id, correct_answer } = await req.json();
    if (!unit_id || !curriculum_id || correct_answer == null) {
      return NextResponse.json({ total: 0, correct: 0, accuracy: null });
    }

    const { data: submissions } = await supabaseAdmin
      .from('fulltest_submissions')
      .select('answers')
      .eq('curriculum_id', curriculum_id);

    let total = 0;
    let correct = 0;

    (submissions ?? []).forEach((sub) => {
      const answer = sub.answers?.[unit_id];
      if (!answer) return;
      total++;
      const isCorrect = Array.isArray(correct_answer)
        ? correct_answer.map((a: string) => a.toLowerCase()).includes(answer.toLowerCase())
        : answer.toUpperCase() === String(correct_answer).toUpperCase();
      if (isCorrect) correct++;
    });

    return NextResponse.json({
      total,
      correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : null,
    });
  } catch {
    return NextResponse.json({ total: 0, correct: 0, accuracy: null });
  }
}
