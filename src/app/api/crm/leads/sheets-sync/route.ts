import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildCrmPayload, normalizePhone, toKSTNaive } from '@/lib/sheets-sync-utils';
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

  if (!body.phone || !body.source_tab || !body.created_time) {
    return NextResponse.json(
      { error: 'Missing required fields: phone, source_tab, created_time' },
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

  // META 리드는 날짜 대신 순번(1, 2, 3…)을 이름에 붙인다
  const isMetaLead =
    payload.source_tab === 'META리드_인스턴트폼' ||
    payload.source_tab === 'META리드_인스턴트폼_목표시험';

  if (isMetaLead && !payload.student_name?.trim()) {
    const { count } = await supabaseAdmin
      .from('students')
      .select('id', { count: 'exact', head: true })
      .contains('campaign_tags', ['META 리드']);

    const seq = (count ?? 0) + 1;
    crmPayload.name = `META리드_${seq}`;
  }

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

/**
 * PATCH /api/crm/leads/sheets-sync
 * 기존 리드의 inquiry_date를 날짜+시각으로 마이그레이션한다.
 * inquiry_date가 이미 시각 포함(길이 > 10)이면 skip.
 */
export async function PATCH(request: NextRequest) {
  if (!isSyncAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { phone: string; created_time: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.phone || !body.created_time) {
    return NextResponse.json(
      { error: 'Missing required fields: phone, created_time' },
      { status: 400 }
    );
  }

  const normalizedPhone = normalizePhone(body.phone);
  const inquiryDatetime = toKSTNaive(body.created_time);

  const { data: existing, error: selectError } = await supabaseAdmin
    .from('students')
    .select('id, inquiry_date')
    .eq('parent_phone', normalizedPhone)
    .maybeSingle();

  if (selectError) {
    console.error('[sheets-sync/migrate] select error', selectError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ action: 'not_found' });
  }

  // 이미 시각 포함된 경우 skip
  if (existing.inquiry_date && existing.inquiry_date.length > 10) {
    return NextResponse.json({ action: 'skipped', student_id: existing.id });
  }

  const { error: updateError } = await supabaseAdmin
    .from('students')
    .update({ inquiry_date: inquiryDatetime })
    .eq('id', existing.id);

  if (updateError) {
    console.error('[sheets-sync/migrate] update error', updateError);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ action: 'updated', student_id: existing.id });
}
