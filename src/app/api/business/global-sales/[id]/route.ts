import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { isCountryCode, normalizeCountryCode } from '@/lib/countries';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin.from('global_sales').delete().eq('id', id);

  if (error) {
    console.error('[global-sales DELETE]', error);
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: { id } });
}

/**
 * 국가만 수정한다 — 국가 컬럼 도입 이전 기록에 나중에 국가를 채워 넣기 위한 경로.
 * 이름·금액·날짜는 여전히 수정 대상이 아니다(추가·삭제로 처리).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { country_code?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!('country_code' in body)) {
    return NextResponse.json({ error: '수정할 필드가 없습니다.' }, { status: 400 });
  }

  const countryCode = normalizeCountryCode(body.country_code);
  if (countryCode && !isCountryCode(countryCode)) {
    return NextResponse.json({ error: '알 수 없는 국가 코드입니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('global_sales')
    .update({ country_code: countryCode })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[global-sales PATCH]', error);
    return NextResponse.json({ error: '국가 수정에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
