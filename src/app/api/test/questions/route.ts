import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600;

const CURRICULUM_ID = 'ccec8c4b-e43d-4b8e-bb77-fc9487486ba8';

const MODULE_ORDER: Record<string, { section: string; order: number }> = {
  '1b8caa34-9cf5-49ad-9f22-4bacf36c6c23': { section: 'Reading and Writing', order: 0 },
  '3328f207-e83d-4457-b9bd-9e291e8f6068': { section: 'Reading and Writing', order: 1 },
  '18e788ef-2f43-4dda-bf16-84491d026a45': { section: 'Math', order: 2 },
  '7e6b9bf8-6683-4b95-acb4-ed20748b88f0': { section: 'Math', order: 3 },
};

export async function GET() {
  const smsUrl = process.env.SMS_SUPABASE_URL;
  const smsKey = process.env.SMS_SUPABASE_SERVICE_KEY;
  if (!smsUrl || !smsKey) {
    return NextResponse.json({ error: 'SMS Supabase not configured' }, { status: 500 });
  }

  const sms = createClient(smsUrl, smsKey);

  const [{ data: units, error }, { data: lessons }] = await Promise.all([
    sms
      .from('units')
      .select('id, title, type, section, difficulty, passage, question, options, correct_answer, scope_lesson_id')
      .eq('scope_curriculum_id', CURRICULUM_ID)
      .order('id'),
    sms
      .from('lessons')
      .select('id, title, order_index')
      .in('id', Object.keys(MODULE_ORDER)),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lessonMap: Record<string, string> = {};
  (lessons ?? []).forEach((l) => { lessonMap[l.id] = l.title; });

  // group by lesson, sorted by module order
  const grouped: Record<string, { id: string; title: string; section: string; order: number; units: typeof units }> = {};
  (units ?? []).forEach((u) => {
    const lid = u.scope_lesson_id;
    if (!lid) return;
    if (!grouped[lid]) {
      const meta = MODULE_ORDER[lid] ?? { section: 'Unknown', order: 99 };
      grouped[lid] = { id: lid, title: lessonMap[lid] ?? 'Module', section: meta.section, order: meta.order, units: [] };
    }
    grouped[lid].units!.push(u);
  });

  const modules = Object.values(grouped).sort((a, b) => a.order - b.order);

  return NextResponse.json({ curriculum_id: CURRICULUM_ID, modules });
}
