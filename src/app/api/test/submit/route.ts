import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { studentName, instagramId, curriculumId, answers } = await req.json();

  if (!studentName || !answers) {
    return NextResponse.json({ error: 'studentName and answers required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('fulltest_submissions')
    .insert({
      student_name: studentName,
      curriculum_id: curriculumId,
      answers,
      instagram_id: instagramId ?? null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    const sms = createClient(
      process.env.SUPERFASTSAT_V2_SUPABASE_URL!,
      process.env.SUPERFASTSAT_V2_SUPABASE_SERVICE_KEY!,
    );
    const { data: units } = await sms
      .from('units')
      .select('id, correct_answer')
      .eq('scope_curriculum_id', curriculumId);

    const correctMap: Record<string, string | string[]> = {};
    (units ?? []).forEach((u) => { correctMap[u.id] = u.correct_answer; });

    let correct = 0;
    let total = 0;
    Object.entries(answers as Record<string, string>).forEach(([unitId, submitted]) => {
      const ca = correctMap[unitId];
      if (!ca) return;
      total++;
      const isCorrect = Array.isArray(ca)
        ? ca.map((a) => a.toLowerCase()).includes(submitted.toLowerCase())
        : submitted.toUpperCase() === String(ca).toUpperCase();
      if (isCorrect) correct++;
    });

    return NextResponse.json({
      id: data.id,
      correct,
      total,
      score: total > 0 ? Math.round((correct / total) * 100) : 0,
    });
  } catch {
    return NextResponse.json({ id: data.id });
  }
}
