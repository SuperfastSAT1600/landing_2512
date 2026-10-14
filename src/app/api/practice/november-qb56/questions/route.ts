import { NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';

export async function GET() {
  const { data, error } = await supabaseSFv2
    .from('units')
    .select('id, question, options, correct_answer, domain, question_type, figure, skill, difficulty')
    .eq('source', 'collegeboard')
    .gte('created_at', '2026-10-12')
    .lt('created_at', '2026-10-13')
    .order('id', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ questions: data });
}
