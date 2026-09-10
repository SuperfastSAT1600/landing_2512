import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { anthropicErrorMessage } from '@/lib/anthropic-error';
import { getQwenAnthropicClient, isQwenConfigured, qwenModel } from '@/lib/qwen';
import { buildDraftContext, parseDraftResult, WINBACK_DRAFT_SYSTEM } from '@/lib/winback/draft';

export const maxDuration = 30;

const STUDENT_FIELDS = 'id,name,grade,parent_phone,lead_status,churn_tag';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, { status: 401 });
  }
  if (!isQwenConfigured()) {
    return NextResponse.json({ error: { message: 'AI가 설정되지 않았습니다.' } }, { status: 503 });
  }

  const { id } = await params;
  const { data: target, error } = await supabaseAdmin
    .from('winback_targets')
    .select(`*, play:winback_plays(*), variant:winback_play_variants(*), student:students(${STUDENT_FIELDS})`)
    .eq('id', id)
    .single();
  if (error || !target?.play || !target.student) {
    return NextResponse.json({ error: { message: '윈백 타겟을 찾을 수 없습니다.' } }, { status: 404 });
  }
  if (target.sent_at) {
    return NextResponse.json({ error: { message: '이미 발송한 타겟의 문구는 다시 생성할 수 없습니다.' } }, { status: 409 });
  }

  try {
    const client = getQwenAnthropicClient();
    const response = await client.messages.create({
      model: qwenModel('fast'),
      max_tokens: 400,
      system: [{ type: 'text', text: WINBACK_DRAFT_SYSTEM }],
      messages: [{ role: 'user', content: buildDraftContext({ play: target.play, variant: target.variant, target, student: target.student }) }],
    });
    const text = response.content.filter((block) => block.type === 'text').map((block) => (block as { text: string }).text).join('');
    const result = parseDraftResult(text);
    if (!result) return NextResponse.json({ error: { message: 'AI 응답을 해석하지 못했습니다.' } }, { status: 502 });

    const { data, error: updateError } = await supabaseAdmin
      .from('winback_targets')
      .update({ message_draft: result.message_draft, message_generated_at: new Date().toISOString(), message_model: qwenModel('fast'), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*, student:students(${STUDENT_FIELDS})`)
      .single();
    if (updateError || !data) throw updateError ?? new Error('초안 저장에 실패했습니다.');
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[winback-targets/[id]/draft]', err);
    return NextResponse.json({ error: { message: anthropicErrorMessage(err) } }, { status: 502 });
  }
}
