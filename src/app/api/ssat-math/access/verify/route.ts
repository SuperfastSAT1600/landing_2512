import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const { student_name, code } = await req.json() as { student_name?: string; code?: string };

  if (!code?.trim()) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAM', message: '코드를 입력해주세요.' } },
      { status: 400 }
    );
  }
  if (!student_name?.trim()) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAM', message: '이름을 입력해주세요.' } },
      { status: 400 }
    );
  }

  const codeStr = code.trim();
  const { data, error } = await supabaseAdmin
    .from('vocab_access_codes')
    .select('id, is_active, scope, first_used_at')
    .eq('code', codeStr)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'INVALID_CODE', message: '코드가 올바르지 않아요.' } },
      { status: 401 }
    );
  }

  if (!data.is_active) {
    return NextResponse.json(
      { error: { code: 'INACTIVE_CODE', message: '비활성화된 코드예요. 관리자에게 문의해주세요.' } },
      { status: 401 }
    );
  }

  if (data.scope !== 'ssat_math' && data.scope !== 'both') {
    return NextResponse.json(
      { error: { code: 'SCOPE_MISMATCH', message: 'SSAT Math 접근 권한이 없는 코드예요.' } },
      { status: 401 }
    );
  }

  if (!data.first_used_at) {
    await supabaseAdmin
      .from('vocab_access_codes')
      .update({ first_used_at: new Date().toISOString() })
      .eq('id', data.id);
  }

  const studentId = `${student_name.trim()}_${codeStr}`;
  return NextResponse.json({ data: { student_id: studentId }, meta: { requestId } });
}
