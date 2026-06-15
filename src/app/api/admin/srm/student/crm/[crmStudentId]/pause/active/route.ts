import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ crmStudentId: string }> }
) {
  const { crmStudentId } = await params;
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabaseAdmin
    .from('student_pauses')
    .update({ ended_at: new Date().toISOString() })
    .eq('student_id', crmStudentId)
    .is('ended_at', null)
    .lte('pause_start', today)
    .or(`pause_until.is.null,pause_until.gte.${today}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
