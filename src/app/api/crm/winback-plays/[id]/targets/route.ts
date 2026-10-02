import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { assignVariants } from '@/lib/winback/mirror';
import type { WinbackCandidate } from '@/types/crm';
import { apiError, unauthorized } from '@/lib/api-response';

/**
 * POST /api/crm/winback-plays/[id]/targets
 * 추천 결과에서 고른 리드를 이 플레이의 타겟으로 확정한다.
 * 전략 변형은 라운드로빈 균등 배정(A/B 비교의 표본 쏠림 방지), 이미 담긴 학생은 조용히 skip.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) return unauthorized();
  const { id: playId } = await params;

  let body: { candidates?: WinbackCandidate[]; student_ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  // 추천 결과(근거 포함) 또는 학생 id만(리드풀에서 손으로 추가) 둘 다 받는다.
  const candidates: WinbackCandidate[] =
    body.candidates?.length
      ? body.candidates
      : (body.student_ids ?? []).map((sid, i) => ({
          student_id: sid,
          name: '',
          grade: '',
          churn_tag: null,
          rank: i + 1,
          score: 0,
          rule_score: 0,
          similarity: null,
          llm_fit: null,
          reason: '리드풀에서 직접 추가',
          signals: [],
          last_memo: null,
        }));

  if (candidates.length === 0) {
    return apiError('BAD_REQUEST', '추가할 리드를 선택해주세요.', 400);
  }

  const { data: play, error: playError } = await supabaseAdmin
    .from('winback_plays')
    .select('id')
    .eq('id', playId)
    .single();
  if (playError || !play) {
    return apiError('NOT_FOUND', '플레이를 찾을 수 없습니다.', 404);
  }

  const [{ data: variants }, { data: existing }] = await Promise.all([
    supabaseAdmin.from('winback_play_variants').select('id').eq('play_id', playId).order('sort_order'),
    supabaseAdmin.from('winback_targets').select('student_id, variant_id').eq('play_id', playId),
  ]);

  const existingIds = new Set((existing ?? []).map((r) => (r as { student_id: string }).student_id));
  const fresh = candidates.filter((c) => !existingIds.has(c.student_id));
  if (fresh.length === 0) {
    return NextResponse.json({ data: { inserted: [], skipped: candidates.length } });
  }

  // 기존 배정 수를 시작 인덱스로 넘겨 재추가 시에도 변형 균형이 유지되게 한다.
  const variantIds = (variants ?? []).map((v) => (v as { id: string }).id);
  const assignment = assignVariants(
    fresh.map((c) => c.student_id),
    variantIds,
    (existing ?? []).length
  );

  const rows = fresh.map((c) => ({
    play_id: playId,
    student_id: c.student_id,
    variant_id: assignment.get(c.student_id) ?? null,
    rank: c.rank,
    score: c.score,
    rule_score: c.rule_score,
    similarity: c.similarity,
    llm_fit: c.llm_fit,
    reason: c.reason,
    signals: c.signals,
    status: 'queued' as const,
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from('winback_targets')
    .insert(rows)
    .select(`*, student:students(id, name, grade, parent_phone, lead_status, churn_tag)`);

  if (error) {
    console.error('[winback targets POST]', error);
    return apiError('INTERNAL_ERROR', `타겟 추가에 실패했습니다: ${error.message}`, 500);
  }

  return NextResponse.json(
    { data: { inserted: inserted ?? [], skipped: candidates.length - fresh.length } },
    { status: 201 }
  );
}
