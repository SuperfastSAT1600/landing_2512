import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { apiError, unauthorized } from '@/lib/api-response';

const EDITABLE_FIELDS = [
  'name',
  'contact_person',
  'contact_phone',
  'contact_email',
  'contract_terms',
  'notes',
  'is_active',
] as const;

// GET /api/crm/companies/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) return unauthorized();

  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return apiError('NOT_FOUND', '업체를 찾을 수 없습니다.', 404);
  }

  return NextResponse.json({ data });
}

// PATCH /api/crm/companies/:id — 메타데이터 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) return unauthorized();

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const update: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in body) update[key] = body[key];
  }
  if ('name' in update && !String(update.name ?? '').trim()) {
    return apiError('BAD_REQUEST', '업체명은 비울 수 없습니다.', 400);
  }
  if (Object.keys(update).length === 0) {
    return apiError('BAD_REQUEST', '수정할 필드가 없습니다.', 400);
  }
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('companies')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return apiError('CONFLICT', '이미 등록된 업체명입니다.', 409);
    }
    console.error('[companies PATCH]', error);
    return apiError('INTERNAL_ERROR', '업체 수정에 실패했습니다.', 500);
  }

  return NextResponse.json({ data });
}

// DELETE /api/crm/companies/:id
// 기본: 소프트 삭제(is_active=false) — 과거 리드/매출 귀속 보존.
// ?hard=true: 연결된 리드가 0건일 때만 실제 삭제(있으면 409).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) return unauthorized();

  const hard = new URL(request.url).searchParams.get('hard') === 'true';

  if (!hard) {
    const { error } = await supabaseAdmin
      .from('companies')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('[companies DELETE soft]', error);
      return apiError('INTERNAL_ERROR', '업체 비활성화에 실패했습니다.', 500);
    }
    return NextResponse.json({ data: { id, is_active: false } });
  }

  // 하드 삭제 전 연결 리드 확인
  const { count, error: countErr } = await supabaseAdmin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', id);
  if (countErr) {
    console.error('[companies DELETE count]', countErr);
    return apiError('INTERNAL_ERROR', '업체 삭제 확인에 실패했습니다.', 500);
  }
  if ((count ?? 0) > 0) {
    return apiError('CONFLICT', `연결된 리드 ${count}건이 있어 삭제할 수 없습니다. 비활성화를 사용하세요.`, 409);
  }

  const { error } = await supabaseAdmin.from('companies').delete().eq('id', id);
  if (error) {
    console.error('[companies DELETE hard]', error);
    return apiError('INTERNAL_ERROR', '업체 삭제에 실패했습니다.', 500);
  }

  return NextResponse.json({ data: { id } });
}
