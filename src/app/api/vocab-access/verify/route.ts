import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const { instagram_id, code } = await req.json() as { instagram_id?: string; code?: string };

  if (!code?.trim()) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAM', message: '코드를 입력해주세요.' } },
      { status: 400 },
    );
  }

  const codeStr = code.trim();
  let query = supabaseAdmin
    .from('vocab_access_codes')
    .select('id, is_active, first_used_at, instagram_id')
    .eq('code', codeStr);

  if (instagram_id?.trim()) {
    // 직접 입력 모드: instagram_id + code 일치 확인
    const normalized = instagram_id.trim().replace(/^@/, '').toLowerCase();
    query = query.eq('instagram_id', normalized);
  } else {
    // 코드 전용 모드: instagram_id IS NULL인 리드 코드
    query = query.is('instagram_id', null);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'INVALID_CODE', message: '코드가 올바르지 않아요.' } },
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

  const identifier = data.instagram_id ?? codeStr;
  return NextResponse.json({ data: { ok: true, instagram_id: identifier }, meta: { requestId } });
}
