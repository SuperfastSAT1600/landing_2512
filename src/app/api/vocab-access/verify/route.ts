import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const { instagram_id, code } = await req.json() as { instagram_id?: string; code?: string };

  if (!instagram_id?.trim() || !code?.trim()) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAM', message: '인스타 ID와 코드를 모두 입력해주세요.' } },
      { status: 400 },
    );
  }

  const normalized = instagram_id.trim().replace(/^@/, '').toLowerCase();

  const { data, error } = await supabaseAdmin
    .from('vocab_access_codes')
    .select('id, is_active, first_used_at')
    .eq('instagram_id', normalized)
    .eq('code', code.trim())
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'INVALID_CODE', message: '인스타 ID 또는 코드가 올바르지 않아요.' } },
      { status: 401 },
    );
  }

  if (!data.is_active) {
    return NextResponse.json(
      { error: { code: 'INACTIVE_CODE', message: '비활성화된 코드예요. 관리자에게 문의해주세요.' } },
      { status: 401 },
    );
  }

  if (!data.first_used_at) {
    await supabaseAdmin
      .from('vocab_access_codes')
      .update({ first_used_at: new Date().toISOString() })
      .eq('id', data.id);
  }

  return NextResponse.json({ data: { ok: true, instagram_id: normalized }, meta: { requestId } });
}
