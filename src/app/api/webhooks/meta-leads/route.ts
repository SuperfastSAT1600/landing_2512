/**
 * Meta Lead Ads 웹훅 — Instagram/Facebook 광고 리드 자동 수집
 *
 * GET : hub.challenge 검증 (Meta 웹훅 등록 시)
 * POST: 리드 수신 → Graph API 조회 → Supabase CRM 등록 → Slack 알림
 *
 * 응답 규칙:
 *   서명/토큰 오류 → 400/403
 *   그 외 모든 실패 → 200 (Meta 재시도 방지)
 *   중복 lead → 200 skip
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  verifyMetaSignature,
  fetchMetaLeadData,
  fetchAdTimezone,
  fetchCampaignName,
  fetchAdsetName,
  fetchFormLabels,
  buildLeadSlackBlocks,
  sendSlackLeadWebhook,
  sendSlackLeadMessage,
  parseLeadFields,
} from '@/lib/meta-lead-webhook';

const SLACK_LEADS_CHANNEL_ID = 'C07FK85V9PD';
const RETRY_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 5000;
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const slackWebhookUrl = process.env.SLACK_LEADS_WEBHOOK_URL;

  if (!appSecret || !accessToken) {
    console.error('[meta-leads] META_APP_SECRET 또는 META_PAGE_ACCESS_TOKEN 미설정');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // 서명 검증
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

  // 각 entry를 독립 처리 — 하나 실패해도 나머지 계속
  const results = await Promise.all(
    entries.map(entry => processLeadEntry(entry, accessToken, slackWebhookUrl))
  );

  return NextResponse.json({ ok: true, results });
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

async function processLeadEntry(
  entry: LeadEntry,
  accessToken: string,
  slackWebhookUrl: string | undefined,
): Promise<{ leadgenId: string; status: string }> {
  const { leadgenId } = entry;

  // REQ-006: 중복 체크
  const { data: existing } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('meta_lead_id', leadgenId)
    .maybeSingle();

  if (existing) {
    return { leadgenId, status: 'skipped_duplicate' };
  }

  // REQ-A01: Graph API 확장 조회 (ad_id 없으면 1회 재시도)
  let leadData;
  try {
    leadData = await fetchMetaLeadData(leadgenId, accessToken);
    if (!leadData.ad_id) {
      await sleep(RETRY_DELAY_MS);
      leadData = await fetchMetaLeadData(leadgenId, accessToken);
    }
  } catch (err) {
    console.error('[meta-leads] Graph API 실패:', leadgenId, err);
    if (slackWebhookUrl) {
      const msg = `⚠️ 리드 상세 조회 실패 / leadgen_id: ${leadgenId} / form_id: 알 수 없음`;
      await sendSlackLeadWebhook(msg, slackWebhookUrl).catch(e =>
        console.error('[meta-leads] Slack 오류 알림 실패:', e)
      );
    }
    return { leadgenId, status: 'graph_api_error' };
  }

  // 웹훅 payload의 ad_name을 Graph API 값 부재 시 fallback으로 사용
  if (!leadData.ad_name && entry.adName) leadData.ad_name = entry.adName;

  // REQ-A02: 광고 계정 시간대 + 캠페인명 + 광고세트명 조회
  let localTz: string | null = null;
  let adsetName: string | null = null;
  if (leadData.ad_id) {
    const adResults = await Promise.all([
      fetchAdTimezone(leadData.ad_id, accessToken).catch(() => null),
      fetchAdsetName(leadData.ad_id, accessToken).catch(() => null),
      !leadData.campaign_name
        ? fetchCampaignName(leadData.ad_id, accessToken)
            .then(name => { if (name) leadData.campaign_name = name; })
            .catch(() => null)
        : Promise.resolve(null),
    ]);
    localTz = adResults[0];
    adsetName = adResults[1];
  }

  // REQ-A03: 폼 질문 라벨
  const labels = leadData.form_id
    ? await fetchFormLabels(leadData.form_id, accessToken).catch(() => new Map<string, string>())
    : new Map<string, string>();

  // REQ-PHONE-01: 전화번호 기반 기존 리드 중복 체크
  const { name: formName, phone, grade: formGrade, targetScore } = parseLeadFields(leadData.field_data);

  let existingStudentId: string | null = null;
  if (phone) {
    const normalizedPhone = phone.startsWith('+82') ? '0' + phone.slice(3) : phone;
    const { data: existingByPhone } = await supabaseAdmin
      .from('students')
      .select('id, name')
      .or(`parent_phone.eq.${phone},parent_phone.eq.${normalizedPhone}`)
      .limit(1)
      .maybeSingle();
    if (existingByPhone) {
      existingStudentId = existingByPhone.id;
    }
  }

  // REQ-A04: Slack Block Kit 알림 (Bot Token 우선, incoming webhook fallback)
  if (slackWebhookUrl || process.env.SLACK_BOT_TOKEN) {
    try {
      const { text, blocks } = buildLeadSlackBlocks({ leadData, localTz, labels, adsetName, existingStudentId });
      await sendSlackLeadMessage({
        text,
        blocks,
        botToken: process.env.SLACK_BOT_TOKEN,
        channelId: SLACK_LEADS_CHANNEL_ID,
        webhookUrl: slackWebhookUrl,
      });
    } catch (err) {
      console.error('[meta-leads] Slack 전송 실패:', leadgenId, err);
    }
  }

  // REQ-PHONE-01: 재문의 리드는 새 CRM 카드 생성 안 함
  if (existingStudentId) {
    return { leadgenId, status: 'reinquiry' };
  }

  // REQ-004: Supabase CRM 등록

  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const stamp = kst.getFullYear().toString()
    + String(kst.getMonth() + 1).padStart(2, '0')
    + String(kst.getDate()).padStart(2, '0')
    + '_'
    + String(kst.getHours()).padStart(2, '0')
    + String(kst.getMinutes()).padStart(2, '0')
    + String(kst.getSeconds()).padStart(2, '0');
  const name = formName ?? '(이름 없음)';

  const { error: dbError } = await supabaseAdmin
    .from('students')
    .insert([{
      name,
      grade: formGrade ?? '기타',
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
      ad_name: leadData.ad_name ?? null,
      adset_name: adsetName,
      ...(targetScore !== null && { target_score: targetScore }),
    }]);

  if (dbError) {
    console.error('[meta-leads] DB 삽입 실패:', dbError);
    return { leadgenId, status: 'db_error' };
  }

  return { leadgenId, status: 'created' };
}
