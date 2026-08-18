import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { sfv2ProfileId, crmStudentId, force } = await req.json();
  if (!sfv2ProfileId || !crmStudentId) {
    return NextResponse.json({ error: 'sfv2ProfileId and crmStudentId required' }, { status: 400 });
  }

  // 동일 학생 재연결은 멱등 허용 — 다른 학생에 이미 연결된 경우 force 없이 차단
  const { data: existing } = await supabaseAdmin
    .from('students')
    .select('id, name')
    .eq('sfv2_profile_id', sfv2ProfileId)
    .neq('id', crmStudentId)
    .maybeSingle();

  if (existing && !force) {
    return NextResponse.json(
      { error: 'already_linked', existingName: existing.name },
      { status: 409 }
    );
  }

  // force=true: 기존 연결 해제 후 재연결
  if (existing && force) {
    const { error: clearError } = await supabaseAdmin
      .from('students')
      .update({ sfv2_profile_id: null })
      .eq('id', existing.id);
    if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });
  }

  const { error } = await supabaseAdmin
    .from('students')
    .update({ sfv2_profile_id: sfv2ProfileId })
    .eq('id', crmStudentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
