import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isAuthenticated } from '@/lib/server-auth';
import { apiError, unauthorized } from '@/lib/api-response';
import { isSrmStatus } from '@/lib/srm-status';

// /api/crm/students/[id]/srm-status
// 과목별 수강 상태(SFv2 payments.management_status) 조회·변경. SRM 관리 화면에는 SFv2 DB 트리거가 반영한다.

type Params = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function profileIdOf(id: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from('students').select('sfv2_profile_id').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { sfv2_profile_id?: string | null } | null)?.sfv2_profile_id ?? null;
}

async function listSubjects(profileId: string) {
  const { data, error } = await supabaseSFv2.from('payments').select('subject, management_status').eq('student_id', profileId).order('subject');
  if (error) throw new Error(error.message);
  return ((data ?? []) as { subject: string; management_status: string | null }[])
    .map((r) => ({ subject: r.subject, status: r.management_status }));
}

const noProfile = () => apiError('no_v2_profile', 'SRM 프로필이 연결되지 않았습니다.', 404);
const upstream = (e: unknown) => apiError('UPSTREAM_ERROR', e instanceof Error ? e.message : 'SFv2 조회 실패', 502);

export async function GET(req: NextRequest, { params }: Params) {
  if (!isAuthenticated(req)) return unauthorized();
  const { id } = await params;
  try {
    const profileId = await profileIdOf(id);
    if (!profileId) return noProfile();
    return NextResponse.json({ data: { subjects: await listSubjects(profileId) } });
  } catch (e) {
    return upstream(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!isAuthenticated(req)) return unauthorized();
  const { id } = await params;
  if (!UUID_RE.test(id)) return apiError('BAD_REQUEST', '학생 id가 올바르지 않습니다.', 400);
  const body = (await req.json().catch(() => null)) as { subject?: unknown; status?: unknown } | null;
  const subject = typeof body?.subject === 'string' ? body.subject : '';
  if (!subject || !isSrmStatus(body?.status)) return apiError('BAD_REQUEST', '과목과 상태를 확인해 주세요.', 400);
  const status = body.status;

  try {
    const profileId = await profileIdOf(id);
    if (!profileId) return noProfile();
    const { data, error } = await supabaseSFv2.from('payments')
      .update({ management_status: status }).eq('student_id', profileId).eq('subject', subject).select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) return apiError('no_account', `${subject} 결제 계정이 없습니다. SRM에서 먼저 등록해 주세요.`, 404);

    const subjects = await listSubjects(profileId);
    // CRM의 옛 휴원 기록(student_pauses)은 '재원'을 '휴원'으로 덮어쓴다 — 휴원인 과목이 하나도 없으면 닫아 엇갈리지 않게 한다.
    // 상태 변경은 이미 저장됐으니 정리가 실패해도 변경 실패로 알리지 않는다.
    if (!subjects.some((x) => x.status === 'paused')) {
      const { error: pauseError } = await supabaseAdmin.from('student_pauses')
        .update({ ended_at: new Date().toISOString() }).is('ended_at', null)
        .or(`student_id.eq.${id},sfv2_profile_id.eq.${profileId}`);
      if (pauseError) console.error('[srm-status] student_pauses close failed', pauseError.message);
    }
    return NextResponse.json({ data: { subjects } });
  } catch (e) {
    return upstream(e);
  }
}
