import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { sfv2ProfileId, crmStudentId } = await req.json();
  if (!sfv2ProfileId || !crmStudentId) {
    return NextResponse.json({ error: 'sfv2ProfileId and crmStudentId required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('students')
    .update({ sfv2_profile_id: sfv2ProfileId })
    .eq('id', crmStudentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
