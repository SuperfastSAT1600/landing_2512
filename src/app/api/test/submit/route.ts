import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { studentName, curriculumId, answers } = await req.json();

  if (!studentName || !answers) {
    return NextResponse.json({ error: 'studentName and answers required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('fulltest_submissions')
    .insert({ student_name: studentName, curriculum_id: curriculumId, answers })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id });
}
