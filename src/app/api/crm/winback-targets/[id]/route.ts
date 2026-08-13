import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { appendConsultationEntry } from '@/lib/consultation-timeline';
import { buildMirrorMemo } from '@/lib/winback/mirror';

const TARGET_SELECT = `*, play:winback_plays(title), variant:winback_play_variants(name)`;

// PATCH 허용 필드 화이트리스트. 발송 기록은 미러 라이트가 필요해 bulk 라우트(mark_sent)로만 처리한다.
const EDITABLE = [
  'variant_id',
  'status',
  'sent_at',
  'sent_by',
  'sent_channel',
  'sent_message',
  'reactivation_entry_id',
  'message_draft',
  'response',
  'responded_at',
  'reconnected_at',
  'converted_payment_id',
  'converted_at',
  'conversion_amount',
  'conversion_source',
  'notes',
] as const;

/** 반응을 마킹하면 시각도 함께 남긴다(응답 시각을 따로 입력하게 하지 않는다). */
function withDerivedTimestamps(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (key in body) out[key] = body[key];
  }
  if ('response' in out && out.response && !('responded_at' in out)) {
    out.responded_at = new Date().toISOString();
  }
  // 수동으로 전환을 지정하면 자동 귀속이 덮지 못하게 표시한다.
  if (('converted_at' in out || 'converted_payment_id' in out) && !('conversion_source' in out)) {
    out.conversion_source = 'manual';
  }
  return out;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const timelineMessage = typeof body.sent_message === 'string' ? body.sent_message.trim() : null;
  const updateBody = { ...body };
  delete updateBody.sent_message;
  const update: Record<string, unknown> = {
    ...withDerivedTimestamps(updateBody),
    updated_at: new Date().toISOString(),
  };

  const { data: target, error: targetError } = await supabaseAdmin
    .from('winback_targets')
    .select(TARGET_SELECT)
    .eq('id', id)
    .single();
  if (targetError || !target) {
    return NextResponse.json({ error: '타겟을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (timelineMessage !== null) {
    const playTitle = (target.play as { title?: string } | null)?.title ?? '윈백';
    const variantName = (target.variant as { name?: string } | null)?.name ?? null;
    await appendConsultationEntry(target.student_id, {
      raw_memo: buildMirrorMemo({ playTitle, variantName, message: timelineMessage }),
      published: false,
    });
    update.sent_message = timelineMessage || null;
  }

  const { data, error } = await supabaseAdmin
    .from('winback_targets')
    .update(update)
    .eq('id', id)
    .select(`*, student:students(id, name, grade, parent_phone, lead_status, churn_tag)`)
    .single();

  if (error) {
    console.error('[winback-targets/[id] PATCH]', error);
    return NextResponse.json({ error: `수정에 실패했습니다: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ data });
} // only explicit per-target timeline updates use sent_message; normal patches remain unchanged.

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const { error } = await supabaseAdmin.from('winback_targets').delete().eq('id', id);
  if (error) {
    console.error('[winback-targets/[id] DELETE]', error);
    return NextResponse.json({ error: `삭제에 실패했습니다: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ data: { id } });
}
