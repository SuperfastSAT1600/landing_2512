/**
 * Meta Lead Ads 웹훅 — Instagram/Facebook 광고 리드 자동 수집
 *
 * GET : hub.challenge 검증 (Meta 웹훅 등록 시)
 * POST: 리드 수신 → Graph API 조회 → Supabase CRM 등록 → Slack 알림
 *
 * 응답 규칙:
 *   서명/토큰 오류 → 400/403 (Meta가 재시도하지 않도록)
 *   Graph API·DB 오류 → 500 (Meta가 재시도)
 *   중복 lead → 200 skip (idempotent)
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyMetaSignature, fetchMetaLeadData, parseLeadFields } from '@/lib/meta-lead-webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LEAD_CHANNEL = 'C07FK85V9PD';

// ── GET: hub.challenge 검증 ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error('[meta-leads] META_WEBHOOK_VERIFY_TOKEN 미설정');
    return new NextResponse('Server misconfiguration', { status: 500 });
  }

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// ── POST: 리드 수신 처리 ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!appSecret || !accessToken) {
    console.error('[meta-leads] META_APP_SECRET 또는 FACEBOOK_ACCESS_TOKEN 미설정');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // REQ-002: 서명 검증
  const signature = request.headers.get('x-hub-signature-256') ?? '';
  const rawBody = Buffer.from(await request.arrayBuffer());

  if (!verifyMetaSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString('utf-8'));
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const entries = extractLeadEntries(payload);
  if (entries.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'no leadgen entries' });
  }

  try {
    const results = await Promise.all(entries.map(entry => processLeadEntry(entry, accessToken)));
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error('[meta-leads] 처리 실패:', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

// ── 내부 처리 ────────────────────────────────────────────────────────────────

interface LeadEntry {
  leadgenId: string;
  adName: string | null;
  pageId: string | null;
}

function extractLeadEntries(payload: unknown): LeadEntry[] {
  if (typeof payload !== 'object' || payload === null) return [];
  const p = payload as Record<string, unknown>;
  if (p.object !== 'page') return [];

  const entries: LeadEntry[] = [];
  const entryArr = Array.isArray(p.entry) ? p.entry : [];

  for (const entry of entryArr) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const changes = Array.isArray(e.changes) ? e.changes : [];

    for (const change of changes) {
      if (typeof change !== 'object' || change === null) continue;
      const c = change as Record<string, unknown>;
      if (c.field !== 'leadgen') continue;

      const val = c.value as Record<string, unknown> | undefined;
      const leadgenId = typeof val?.leadgen_id === 'string' ? val.leadgen_id : null;
      if (!leadgenId) continue;

      entries.push({
        leadgenId,
        adName: typeof val?.ad_name === 'string' ? val.ad_name : null,
        pageId: typeof e.id === 'string' ? e.id : null,
      });
    }
  }
  return entries;
}

async function processLeadEntry(entry: LeadEntry, accessToken: string): Promise<{ leadgenId: string; status: string }> {
  const { leadgenId, adName } = entry;

  // REQ-006: 중복 체크
  const { data: existing } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('meta_lead_id', leadgenId)
    .maybeSingle();

  if (existing) {
    return { leadgenId, status: 'skipped_duplicate' };
  }

  // REQ-003: Graph API에서 폼 데이터 조회
  let leadData;
  try {
    leadData = await fetchMetaLeadData(leadgenId, accessToken);
  } catch (err) {
    console.error('[meta-leads] Graph API 실패:', leadgenId, err);
    throw err;
  }

  const { name: formName, phone } = parseLeadFields(leadData.field_data);

  // 자동 이름: 폼에 이름이 없으면 타임스탬프 기반 생성
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const stamp = kst.getFullYear().toString()
    + String(kst.getMonth() + 1).padStart(2, '0')
    + String(kst.getDate()).padStart(2, '0')
    + '_'
    + String(kst.getHours()).padStart(2, '0')
    + String(kst.getMinutes()).padStart(2, '0')
    + String(kst.getSeconds()).padStart(2, '0');
  const name = formName ?? `인스타_${stamp}`;

  // REQ-004: Supabase 삽입
  const { data: student, error: dbError } = await supabaseAdmin
    .from('students')
    .insert([{
      name,
      grade: '기타',
      school_type: '한국 학제',
      parent_phone: phone ?? '',
      inquiry_date: kst.toISOString().slice(0, 16) + ':00',
      inquiry_channel: '인스타그램 링크',
      traffic_source: '인스타그램 광고',
      lead_type: 'B2C',
      previous_score_status: 'never_taken',
      desired_subjects: 'Both',
      funnel_stage: '0',
      consultation_timeline: [],
      entered_by: 'meta-webhook',
      meta_lead_id: leadgenId,
    }])
    .select()
    .single();

  if (dbError) {
    console.error('[meta-leads] DB 삽입 실패:', dbError);
    throw new Error(dbError.message);
  }

  const studentId = (student as { id: string }).id;

  // REQ-005: Slack 알림
  await postLeadSlack({ name, phone, adName, studentId });

  return { leadgenId, status: 'created' };
}

async function postLeadSlack(info: {
  name: string;
  phone: string | null;
  adName: string | null;
  studentId: string;
}): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn('[meta-leads] SLACK_BOT_TOKEN 미설정 — Slack 알림 skip');
    return;
  }

  const crmUrl = 'https://tutoring.superfastsat.com/admin/crm';
  const lines = [
    `*인스타그램 광고 리드 신규 접수*`,
    `*이름:* ${info.name}`,
    info.phone ? `*전화:* ${info.phone}` : null,
    info.adName ? `*광고:* ${info.adName}` : null,
  ].filter(Boolean).join('\n');

  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: lines },
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'CRM 보기 →' },
        url: crmUrl,
      },
    },
  ];

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      channel: LEAD_CHANNEL,
      text: `인스타 광고 리드: ${info.name}`,
      blocks,
    }),
  });

  const data = await res.json() as { ok: boolean; error?: string };
  if (!data.ok) console.error('[meta-leads] Slack 전송 실패:', data.error);
}
