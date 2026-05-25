import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildCrmPayload, normalizePhone } from '@/lib/sheets-sync-utils';
import type { SheetsSyncPayload } from '@/lib/sheets-sync-utils';

function isSyncAuthenticated(request: NextRequest): boolean {
  const key = request.headers.get('x-sync-key');
  const secret = process.env.SHEETS_SYNC_SECRET;
  if (!secret) {
    console.error('[sheets-sync] SHEETS_SYNC_SECRET not configured');
    return false;
  }
  return key === secret;
}

/**
 * POST /api/crm/leads/sheets-sync
 * Google Apps Script에서 META 인스턴트폼 리드 데이터를 수신해 CRM에 등록한다.
 * 동일 전화번호가 존재하면 campaign_tags만 병합(merge)한다.
 */
export async function POST(request: NextRequest) {
  if (!isSyncAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Partial<SheetsSyncPayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.phone || !body.source_tab || !body.created_time || !body.platform) {
    return NextResponse.json(
      { error: 'Missing required fields: phone, source_tab, created_time, platform' },
      { status: 400 }
    );
  }

  const payload = body as SheetsSyncPayload;
  const normalizedPhone = normalizePhone(payload.phone);

  // 중복 체크
  const { data: existing, error: selectError } = await supabaseAdmin
    .from('students')
    .select('id, campaign_tags')
    .eq('parent_phone', normalizedPhone);

  if (selectError) {
    console.error('[sheets-sync] select error', selectError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const crmPayload = buildCrmPayload(payload);

  // ── 병합: 이미 존재하는 번호 ─────────────────────────────────────────────
  if (existing && existing.length > 0) {
    const student = existing[0];
    const mergedTags = Array.from(
      new Set([...(student.campaign_tags ?? []), ...(crmPayload.campaign_tags ?? [])])
    );

    const { data, error: updateError } = await supabaseAdmin
      .from('students')
      .update({ campaign_tags: mergedTags })
      .eq('id', student.id)
      .select()
      .single();

    if (updateError) {
      console.error('[sheets-sync] update error', updateError);
      return NextResponse.json({ error: 'Failed to merge student' }, { status: 500 });
    }

    return NextResponse.json({ action: 'merged', student_id: data.id });
  }

  // ── 신규 등록 ─────────────────────────────────────────────────────────────
  const { data, error: insertError } = await supabaseAdmin
    .from('students')
    .insert([
      {
        ...crmPayload,
        funnel_stage: '0',
        consultation_timeline: [],
      },
    ])
    .select()
    .single();

  if (insertError) {
    console.error('[sheets-sync] insert error', insertError);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }

  return NextResponse.json({ action: 'created', student_id: data.id }, { status: 201 });
}
