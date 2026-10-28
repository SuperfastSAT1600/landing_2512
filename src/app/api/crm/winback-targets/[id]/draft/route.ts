import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { anthropicErrorMessage } from '@/lib/anthropic-error';
import { getQwenAnthropicClient, isQwenConfigured } from '@/lib/qwen';
import { buildDraftContext, memoLines, parseDraftResult, WINBACK_DRAFT_SYSTEM } from '@/lib/winback/draft';
import { apiError, unauthorized } from '@/lib/api-response';

export const maxDuration = 60;

// qwen-turbo는 사람이 읽을 로드맵 문구엔 품질이 부족하고 한도도 자주 걸린다(2026-10-28 Throttling).
const DRAFT_MODEL = process.env.WINBACK_DRAFT_MODEL?.trim() || 'qwen-plus';

/** 오늘 날짜는 한국 기준 — 메모 경과 개월·시험까지 남은 기간 계산에 쓴다. */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const STUDENT_FIELDS = 'id,name,grade,parent_phone,lead_status,churn_tag';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) return unauthorized();
  if (!isQwenConfigured()) {
    return apiError('SERVICE_UNAVAILABLE', 'AI가 설정되지 않았습니다.', 503);
  }

  const { id } = await params;
  const { data: target, error } = await supabaseAdmin
    .from('winback_targets')
    .select(`*, play:winback_plays(*), variant:winback_play_variants(*), student:students(${STUDENT_FIELDS},consultation_timeline)`)
    .eq('id', id)
    .single();
  if (error || !target?.play || !target.student) {
    return apiError('NOT_FOUND', '윈백 타겟을 찾을 수 없습니다.', 404);
  }
  if (target.sent_at) {
    return apiError('CONFLICT', '이미 발송한 타겟의 문구는 다시 생성할 수 없습니다.', 409);
  }

  const today = new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
  try {
    const client = getQwenAnthropicClient();
    const response = await client.messages.create({
      model: DRAFT_MODEL,
      max_tokens: 1200,
      system: [{ type: 'text', text: WINBACK_DRAFT_SYSTEM }],
      messages: [{ role: 'user', content: buildDraftContext({
        play: target.play,
        variant: target.variant,
        target,
        student: { ...target.student, memos: memoLines(target.student.consultation_timeline, today) },
        today,
      }) }],
    });
    const text = response.content.filter((block) => block.type === 'text').map((block) => (block as { text: string }).text).join('');
    const result = parseDraftResult(text);
    if (!result) return apiError('UPSTREAM_ERROR', 'AI 응답을 해석하지 못했습니다.', 502);

    const { data, error: updateError } = await supabaseAdmin
      .from('winback_targets')
      .update({ message_draft: result.message_draft, message_generated_at: new Date().toISOString(), message_model: DRAFT_MODEL, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*, student:students(${STUDENT_FIELDS})`)
      .single();
    if (updateError || !data) throw updateError ?? new Error('초안 저장에 실패했습니다.');
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[winback-targets/[id]/draft]', err);
    return apiError('UPSTREAM_ERROR', anthropicErrorMessage(err), 502);
  }
}
