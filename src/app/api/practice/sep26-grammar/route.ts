import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SEP26_GRAMMAR_SET } from '@/data/practice-sets/sep26-grammar';

export const revalidate = 86400;

interface V2Unit {
  id: string;
  skill: string;
  difficulty: string;
  passage: string;
  question: string;
  options: { label: string; text: string }[];
  correct_answer: string;
  grammar_rule: string | null;
}

export async function GET() {
  const smsUrl = process.env.SUPERFASTSAT_V2_SUPABASE_URL;
  const smsKey = process.env.SUPERFASTSAT_V2_SUPABASE_SERVICE_KEY;
  if (!smsUrl || !smsKey) {
    return NextResponse.json({ error: 'V2 Supabase not configured' }, { status: 500 });
  }

  const sms = createClient(smsUrl, smsKey);
  const ids: string[] = [...SEP26_GRAMMAR_SET.questionIds];

  const { data: units, error } = await sms
    .from('units')
    .select('id, skill, difficulty, passage, question, options, correct_answer, grammar_rule')
    .in('id', ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orderMap = new Map(ids.map((id, i) => [id, i]));
  const sorted = (units as V2Unit[]).sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  );

  const fss = sorted.filter((u) => u.skill === 'Form, Structure, and Sense');
  const bou = sorted.filter((u) => u.skill === 'Boundaries');

  return NextResponse.json({
    setId: SEP26_GRAMMAR_SET.setId,
    title: SEP26_GRAMMAR_SET.title,
    total: sorted.length,
    groups: [
      { skill: 'Form, Structure, and Sense', label: 'Form, Structure & Sense', total: fss.length, questions: fss },
      { skill: 'Boundaries', label: 'Boundaries', total: bou.length, questions: bou },
    ],
  });
}
