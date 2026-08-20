import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { appendConsultationEntry } from '@/lib/consultation-timeline';
import { buildMirrorMemo, playLabel, reactivationStrategyLabel } from '@/lib/winback/mirror';
import { notifyWinbackSendsToSlack, type WinbackSend } from '@/lib/slack-memo';

const TARGET_SELECT = `*, student:students(id, name, grade, parent_phone, lead_status, churn_tag)`;
const ACTIONS = ['mark_sent', 'mark_no_response', 'assign_variant', 'skip'] as const;
type Action = (typeof ACTIONS)[number];

interface BulkBody {
  target_ids?: string[];
  action?: Action;
  author?: string;
  variant_id?: string | null;
  messages?: Record<string, string>;
}

/**
 * 발송 기록 + 미러 라이트.
 * 실제 발송은 담당자가 카톡으로 한다. 여기서는 "보냈다"는 사실을 세 곳에 남긴다:
 *   ① winback_targets (분석 정본) ② 상담 타임라인(사람이 읽는 기록) ③ reactivation_log(기존 재활성화 UI)
 * 이미 발송 기록이 있으면 멱등하게 그대로 반환한다(중복 메모 방지).
 *
 * @returns send — 이번 호출로 새로 남긴 상담 메모(슬랙 공유용). 멱등 반환이면 null.
 */
async function markSent(
  targetId: string,
  author?: string,
  customMessage?: string
): Promise<{ target: unknown; send: WinbackSend | null }> {
  const { data: target, error } = await supabaseAdmin
    .from('winback_targets')
    .select(`*, play:winback_plays(title), variant:winback_play_variants(name)`)
    .eq('id', targetId)
    .single();
  if (error || !target) throw new Error('타겟을 찾을 수 없습니다.');
  if (target.sent_at) return { target, send: null };

  const playTitle = (target.play as { title?: string } | null)?.title ?? '윈백';
  const variantName = (target.variant as { name?: string } | null)?.name ?? null;
  const now = new Date().toISOString();
  const entryId = randomUUID();

  const sentMessage = customMessage ?? target.message_draft;
  await appendConsultationEntry(target.student_id, {
    raw_memo: buildMirrorMemo({ playTitle, variantName, message: sentMessage }),
    ...(author ? { author } : {}),
    published: false,
  });

  const { data: student } = await supabaseAdmin
    .from('students')
    .select('name, lead_status, reactivation_log')
    .eq('id', target.student_id)
    .single();

  const log = Array.isArray(student?.reactivation_log) ? student.reactivation_log : [];
  await supabaseAdmin
    .from('students')
    .update({
      // 이미 등록(enrolled)된 학생을 되돌리지 않는다 — 업셀 발송일 수 있다.
      lead_status: student?.lead_status === 'enrolled' ? student.lead_status : 'reactivating',
      reactivation_log: [
        ...log,
        {
          id: entryId,
          attempted_at: now,
          strategy: reactivationStrategyLabel(playTitle, variantName),
          outcome: 'pending',
        },
      ],
    })
    .eq('id', target.student_id);

  const updatePayload = {
    status: 'sent',
    sent_at: now,
    sent_by: author ?? null,
    ...(sentMessage !== undefined ? { sent_message: sentMessage.trim() || null } : {}),
    reactivation_entry_id: entryId,
    updated_at: now,
  };
  let { data: updated, error: updateError } = await supabaseAdmin
    .from('winback_targets')
    .update(updatePayload)
    .eq('id', targetId)
    .select(TARGET_SELECT)
    .single();

  // Migration 109 may not be applied yet. The timeline is still the source
  // of the exact sent text, so finish the send without the optional column.
  if (updateError?.message.includes('sent_message')) {
    const fallback = await supabaseAdmin
      .from('winback_targets')
      .update({
        status: 'sent',
        sent_at: now,
        sent_by: author ?? null,
        reactivation_entry_id: entryId,
        updated_at: now,
      })
      .eq('id', targetId)
      .select(TARGET_SELECT)
      .single();
    updated = fallback.data;
    updateError = fallback.error;
  }
  if (updateError) throw new Error(updateError.message);

  return {
    target: updated,
    send: {
      studentName: student?.name ?? target.student_id,
      playLabel: playLabel(playTitle, variantName),
      message: sentMessage,
    },
  };
}

/** 발송·미러가 필요 없는 단순 일괄 갱신. */
async function simpleUpdate(targetIds: string[], patch: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('winback_targets')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .in('id', targetIds)
    .select(TARGET_SELECT);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: BulkBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const targetIds = body.target_ids ?? [];
  const action = body.action;
  if (targetIds.length === 0) {
    return NextResponse.json({ error: '대상을 선택해주세요.' }, { status: 400 });
  }
  if (!action || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: '지원하지 않는 작업입니다.' }, { status: 400 });
  }

  try {
    if (action === 'mark_no_response') {
      const data = await simpleUpdate(targetIds, {
        response: 'none',
        responded_at: new Date().toISOString(),
      });
      return NextResponse.json({ data: { updated: data, failed: [] } });
    }
    if (action === 'assign_variant') {
      const data = await simpleUpdate(targetIds, { variant_id: body.variant_id ?? null });
      return NextResponse.json({ data: { updated: data, failed: [] } });
    }
    if (action === 'skip') {
      const data = await simpleUpdate(targetIds, { status: 'skipped' });
      return NextResponse.json({ data: { updated: data, failed: [] } });
    }
  } catch (err) {
    console.error('[winback-targets/bulk]', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  // mark_sent — 학생 JSONB를 read-modify-write하므로 순차 처리(같은 학생 경합 방지) + 실패 격리.
  const updated: unknown[] = [];
  const failed: { id: string; error: string }[] = [];
  const sends: WinbackSend[] = [];
  for (const id of targetIds) {
    try {
      const hasCustomMessage = Object.prototype.hasOwnProperty.call(body.messages ?? {}, id);
      const result = await markSent(id, body.author, hasCustomMessage ? body.messages?.[id] : undefined);
      updated.push(result.target);
      if (result.send) sends.push(result.send);
    } catch (err) {
      console.error('[winback-targets/bulk mark_sent]', id, err);
      failed.push({ id, error: (err as Error).message });
    }
  }

  // 새로 남긴 발송 메모를 상담 채널에 한 건으로 공유(실패해도 발송 결과에 영향 없음).
  if (sends.length > 0) {
    try {
      await notifyWinbackSendsToSlack({ sends, author: body.author });
    } catch (err) {
      console.error('[winback-targets/bulk slack]', err);
    }
  }

  return NextResponse.json(
    { data: { updated, failed } },
    { status: failed.length > 0 && updated.length > 0 ? 207 : failed.length > 0 ? 500 : 200 }
  );
}
