import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { apiError, unauthorized } from '@/lib/api-response';
import { parsePatchInput, isPatchFailure, type PatchBody } from './_lib/patch-input';
import { buildPatchPlan } from './_lib/patch-update';
import { mirrorOutcome } from './_lib/patch-mirror';

// GET/POST와 응답 shape을 맞춘다 (route.ts의 STUDENT_FIELDS와 동일 집합).
const STUDENT_FIELDS = 'id, name, grade, parent_phone, is_vip, needs_attention, traffic_source, lead_type';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) return unauthorized();

  const { id } = await params;

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Invalid JSON body', 400);
  }

  const input = parsePatchInput(body);
  if (isPatchFailure(input)) return apiError(input.code, input.message, input.status);

  const now = new Date().toISOString();
  const plan = await buildPatchPlan(id, input, now);
  if (isPatchFailure(plan)) return apiError(plan.code, plan.message, plan.status);

  // 이월된 행은 다음 주차로 넘어가 종결됐다 — 오래된 탭에서 날아온 stage 변경이
  // 여기서 걸리지 않으면 carried_stage_check 위반(23514)으로 500 이 난다.
  const { data, error } = await supabaseAdmin
    .from('renewal_targets')
    .update(plan.update)
    .eq('id', id)
    .is('carried_to_week', null)
    .select(`*, student:students(${STUDENT_FIELDS})`)
    .single();

  if (error) {
    console.error('[renewal-targets/[id] PATCH]', error);
    // 0행 매칭 — 이월됐거나 삭제된 대상.
    if (error.code === 'PGRST116') {
      return apiError('ALREADY_CARRIED', '이미 다음 주차로 이월된 대상입니다. 새로고침 후 다시 시도해 주세요.', 409);
    }
    return apiError('UPDATE_FAILED', '수정에 실패했습니다.', 500);
  }

  await mirrorOutcome(plan, data.student_id, body);

  return NextResponse.json({ data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(request)) return unauthorized();

  const { id } = await params;

  const { error } = await supabaseAdmin.from('renewal_targets').delete().eq('id', id);

  if (error) {
    console.error('[renewal-targets/[id] DELETE]', error);
    return apiError('DELETE_FAILED', '삭제에 실패했습니다.', 500);
  }

  return NextResponse.json({ data: { id } });
}
