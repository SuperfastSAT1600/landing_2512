import { createHmac, timingSafeEqual } from 'crypto';

export interface MetaLeadField {
  name: string;
  values: string[];
}

export interface MetaLeadData {
  id: string;
  created_time?: string;
  field_data: MetaLeadField[];
  form_id?: string;
  ad_id?: string;
  ad_name?: string;
  campaign_name?: string;
}

export interface ParsedLeadFields {
  name: string | null;
  phone: string | null;
}

const GRAPH_BASE = 'https://graph.facebook.com/v22.0';

// ── 서명 검증 ──────────────────────────────────────────────────────────────────

/** X-Hub-Signature-256 헤더로 Meta 앱 시크릿 기반 서명 검증 */
export function verifyMetaSignature(rawBody: Buffer, signature: string, appSecret: string): boolean {
  if (!signature.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const actual = signature.slice('sha256='.length);
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
  } catch {
    return false;
  }
}

// ── Graph API 조회 ──────────────────────────────────────────────────────────────

/** Meta Graph API에서 leadgen_id로 리드 상세 데이터 조회 */
export async function fetchMetaLeadData(leadgenId: string, accessToken: string): Promise<MetaLeadData> {
  const fields = 'created_time,field_data,form_id,ad_id,ad_name,campaign_name';
  const url = `${GRAPH_BASE}/${leadgenId}?fields=${fields}&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta Graph API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<MetaLeadData>;
}

// ── 광고 계정 시간대 캐시 ────────────────────────────────────────────────────────

const timezoneCache = new Map<string, string>();

interface AdMeta {
  accountId: string | null;
  campaignName: string | null;
  adsetName: string | null;
}

const adMetaCache = new Map<string, AdMeta>();

/** ad_id → { accountId, campaignName, adsetName } 조회 (ad_id별 캐시) */
async function fetchAdMeta(adId: string, accessToken: string): Promise<AdMeta> {
  if (adMetaCache.has(adId)) return adMetaCache.get(adId)!;

  try {
    const res = await fetch(
      `${GRAPH_BASE}/${adId}?fields=account_id,campaign{name},adset{name}&access_token=${accessToken}`
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[meta-leads] fetchAdMeta: HTTP ${res.status} for ad ${adId} —`, errText);
      return { accountId: null, campaignName: null, adsetName: null };
    }
    const data = await res.json() as { account_id?: string; campaign?: { name?: string }; adset?: { name?: string } };
    const result: AdMeta = {
      accountId: data.account_id ?? null,
      campaignName: data.campaign?.name ?? null,
      adsetName: data.adset?.name ?? null,
    };
    adMetaCache.set(adId, result);
    return result;
  } catch (err) {
    console.error(`[meta-leads] fetchAdMeta: exception for ad ${adId}:`, err);
    return { accountId: null, campaignName: null, adsetName: null };
  }
}

/** ad_id → account_id → IANA 시간대 이름 조회 (account_id별 캐시) */
export async function fetchAdTimezone(adId: string, accessToken: string): Promise<string | null> {
  try {
    const { accountId } = await fetchAdMeta(adId, accessToken);
    if (!accountId) return null;

    if (timezoneCache.has(accountId)) return timezoneCache.get(accountId)!;

    const acctRes = await fetch(`${GRAPH_BASE}/act_${accountId}?fields=timezone_name&access_token=${accessToken}`);
    if (!acctRes.ok) return null;
    const acctData = await acctRes.json() as { timezone_name?: string };
    const tz = acctData.timezone_name ?? null;
    if (tz) timezoneCache.set(accountId, tz);
    return tz;
  } catch {
    return null;
  }
}

/** ad_id → campaign name 조회 */
export async function fetchCampaignName(adId: string, accessToken: string): Promise<string | null> {
  const { campaignName } = await fetchAdMeta(adId, accessToken).catch(() => ({ accountId: null, campaignName: null, adsetName: null }));
  return campaignName;
}

/** ad_id → adset name 조회 */
export async function fetchAdsetName(adId: string, accessToken: string): Promise<string | null> {
  const { adsetName } = await fetchAdMeta(adId, accessToken).catch(() => ({ accountId: null, campaignName: null, adsetName: null }));
  return adsetName;
}

// ── 키워드 기반 라벨 매핑 ────────────────────────────────────────────────────────
// 폼 필드 키가 바뀌거나 새 질문이 생기면 여기만 수정

const KEYWORD_LABEL_RULES: Array<{
  test: (key: string) => boolean;
  label: string;
  isPhone: boolean;
}> = [
  { test: k => k === 'full_name' || k.includes('이름'),                  label: '이름',     isPhone: false },
  { test: k => k.includes('학년'),                                        label: '학년',     isPhone: false },
  { test: k => k.includes('목표') || k.includes('점수'),                  label: '목표점수', isPhone: false },
  { test: k => k === 'phone' || k === 'phone_number',                     label: '연락처',   isPhone: true  },
  { test: k => k !== 'phone' && k !== 'phone_number' && k.includes('연락처'), label: '연락처2',  isPhone: true  },
  { test: k => k === 'email',                                             label: '이메일',   isPhone: false },
];

function resolveFieldLabel(key: string, formApiLabels: Map<string, string>): { label: string; isPhone: boolean } {
  // 1. 키워드 규칙 우선
  for (const rule of KEYWORD_LABEL_RULES) {
    if (rule.test(key)) return { label: rule.label, isPhone: rule.isPhone };
  }
  // 2. form questions API 라벨
  const apiLabel = formApiLabels.get(key);
  if (apiLabel) return { label: apiLabel, isPhone: false };
  // 3. 밑줄 → 공백 fallback
  return { label: key.replace(/_/g, ' '), isPhone: false };
}

// ── 폼 질문 라벨 캐시 ────────────────────────────────────────────────────────────

const formQuestionsCache = new Map<string, Map<string, string>>();

/** form_id → { key → label } 매핑 조회 (form_id별 캐시) */
export async function fetchFormLabels(formId: string, accessToken: string): Promise<Map<string, string>> {
  if (formQuestionsCache.has(formId)) {
    return formQuestionsCache.get(formId)!;
  }

  const map = new Map<string, string>();
  try {
    const res = await fetch(`${GRAPH_BASE}/${formId}?fields=questions&access_token=${accessToken}`);
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[meta-leads] fetchFormLabels: HTTP ${res.status} for form ${formId} —`, errText);
      return map;
    }
    const data = await res.json() as { questions?: { key: string; label: string }[] };
    const qs = data.questions ?? [];
    console.log(`[meta-leads] fetchFormLabels: form ${formId} — ${qs.length}개 질문 수신`);
    for (const q of qs) {
      if (q.key && q.label) map.set(q.key, q.label);
    }
    formQuestionsCache.set(formId, map);
  } catch (err) {
    console.error(`[meta-leads] fetchFormLabels: exception for form ${formId}:`, err);
  }
  return map;
}

// ── Slack 메시지 포맷 ─────────────────────────────────────────────────────────────

function toIsoWithOffset(utcDate: Date, tz: string): string {
  // IANA 시간대 기반 ISO 8601 문자열 (서머타임 반영)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(utcDate);

  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
  const local = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;

  // 오프셋 계산
  const localMs = new Date(local + 'Z').getTime();
  const offsetMin = Math.round((localMs - utcDate.getTime()) / 60000);
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${local}${sign}${hh}:${mm}`;
}

export interface SlackLeadMessage {
  leadData: MetaLeadData;
  localTz: string | null;
  labels: Map<string, string>;
  adsetName?: string | null;
  existingStudentId?: string | null;
}

export function buildLeadSlackText({ leadData, localTz, labels }: SlackLeadMessage): string {
  const createdUtc = leadData.created_time ? new Date(leadData.created_time) : new Date();

  const kstStr = toIsoWithOffset(createdUtc, 'Asia/Seoul');
  const localStr = localTz ? `${toIsoWithOffset(createdUtc, localTz)} (${localTz})` : '알 수 없음';

  const adName = leadData.ad_name ?? '없음';
  const campaignName = leadData.campaign_name ?? '없음';

  const fieldLines = (leadData.field_data ?? []).map(f => {
    const { label, isPhone } = resolveFieldLabel(f.name, labels);
    const value = f.values.join(', ');
    const display = isPhone ? `p:${value}` : value;
    return `${label}:${display}`;
  }).join('\n');

  return [
    `작성일(한국) : ${kstStr}`,
    `작성일(현지) : ${localStr}`,
    `크리에이티브 : ${adName}`,
    `캠페인 : ${campaignName}`,
    fieldLines,
    '----',
  ].join('\n');
}

export interface SlackLeadBlocksResult {
  text: string;
  blocks: Record<string, unknown>[];
}

export function buildLeadSlackBlocks({ leadData, localTz, labels, adsetName, existingStudentId }: SlackLeadMessage): SlackLeadBlocksResult {
  const createdUtc = leadData.created_time ? new Date(leadData.created_time) : new Date();
  const kstStr = toIsoWithOffset(createdUtc, 'Asia/Seoul');
  const localStr = localTz ? `${toIsoWithOffset(createdUtc, localTz)} (${localTz})` : '알 수 없음';

  const adName = leadData.ad_name ?? '없음';
  const campaignName = leadData.campaign_name ?? '없음';
  const adsetStr = adsetName ?? '없음';
  const isReinquiry = !!existingStudentId;

  const fieldLines = (leadData.field_data ?? []).map(f => {
    const { label, isPhone } = resolveFieldLabel(f.name, labels);
    const value = f.values.join(', ');
    const display = isPhone ? `p:${value}` : value;
    return `${label}: ${display}`;
  }).join('\n');

  const bodyText = [
    isReinquiry ? `⚠️ *기존 등록 리드 재문의*` : null,
    `*작성일(한국):* ${kstStr}`,
    `*작성일(현지):* ${localStr}`,
    `*크리에이티브:* ${adName}`,
    `*광고세트:* ${adsetStr}`,
    `*캠페인:* ${campaignName}`,
    '',
    fieldLines,
  ].filter(Boolean).join('\n');

  const nameField = (leadData.field_data ?? []).find(f => ['full_name', 'name'].includes(f.name) || f.name.includes('이름'));
  const fallbackName = nameField?.values?.[0] ?? leadgenIdShort(leadData.id);

  const crmUrl = isReinquiry
    ? `https://tutoring.superfastsat.com/admin/crm?studentId=${existingStudentId}`
    : 'https://tutoring.superfastsat.com/admin/crm';

  const buttonText = isReinquiry ? '기존 카드 보기 →' : 'CRM에서 보기 →';
  const headerText = isReinquiry
    ? `⚠️ 재문의: ${adName} — ${fallbackName}`
    : `새 Meta 리드: ${adName} — ${fallbackName}`;

  return {
    text: headerText,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: bodyText },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: buttonText },
          url: crmUrl,
        },
      },
    ],
  };
}

function leadgenIdShort(id: string): string {
  return id ? id.slice(-6) : '??????';
}

// ── Slack 전송 ──────────────────────────────────────────────────────────────────

export async function sendSlackLeadWebhook(text: string, webhookUrl: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack webhook error ${res.status}: ${body}`);
  }
}

/** Bot Token으로 Block Kit 메시지 전송. Bot Token 미설정 시 incoming webhook fallback. */
export async function sendSlackLeadMessage({
  text,
  blocks,
  botToken,
  channelId,
  webhookUrl,
}: {
  text: string;
  blocks: Record<string, unknown>[];
  botToken?: string;
  channelId?: string;
  webhookUrl?: string;
}): Promise<void> {
  if (botToken && channelId) {
    try {
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${botToken}` },
        body: JSON.stringify({ channel: channelId, text, blocks }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
      return;
    } catch (err) {
      if (!webhookUrl) throw err;
      console.warn('[meta-leads] botToken 실패, webhookUrl fallback:', (err as Error).message);
    }
  }
  if (webhookUrl) {
    await sendSlackLeadWebhook(text, webhookUrl);
  }
}

// ── CRM 파싱 유틸 (기존 유지) ────────────────────────────────────────────────────

const NAME_FIELDS = ['full_name', 'name', '이름', 'first_name'];
const PHONE_FIELDS = ['phone_number', 'phone', '전화번호', '연락처'];

/** field_data 배열에서 이름·전화번호 추출 */
export function parseLeadFields(fieldData: MetaLeadField[]): ParsedLeadFields {
  const get = (keys: string[]) => {
    for (const key of keys) {
      const field = fieldData.find(f => f.name === key);
      if (field?.values?.[0]) return field.values[0];
    }
    return null;
  };
  return { name: get(NAME_FIELDS), phone: get(PHONE_FIELDS) };
}
