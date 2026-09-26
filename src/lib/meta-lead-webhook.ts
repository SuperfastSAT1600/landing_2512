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

/** ad_id → account_id → IANA 시간대 이름 조회 (account_id별 캐시) */
export async function fetchAdTimezone(adId: string, accessToken: string): Promise<string | null> {
  try {
    // Step 1: ad_id → account_id
    const adRes = await fetch(`${GRAPH_BASE}/${adId}?fields=account_id&access_token=${accessToken}`);
    if (!adRes.ok) return null;
    const adData = await adRes.json() as { account_id?: string };
    const accountId = adData.account_id;
    if (!accountId) return null;

    // Step 2: account_id 캐시 확인
    if (timezoneCache.has(accountId)) return timezoneCache.get(accountId)!;

    // Step 3: account → timezone_name
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

// ── 폼 질문 라벨 캐시 ────────────────────────────────────────────────────────────

const formQuestionsCache = new Map<string, Map<string, string>>();

const DEFAULT_LABELS: Record<string, string> = {
  full_name: '이름',
  phone_number: '연락처',
  email: '이메일',
};

/** form_id → { key → label } 매핑 조회 (form_id별 캐시) */
export async function fetchFormLabels(formId: string, accessToken: string): Promise<Map<string, string>> {
  if (formQuestionsCache.has(formId)) return formQuestionsCache.get(formId)!;

  const map = new Map<string, string>(Object.entries(DEFAULT_LABELS));
  try {
    const res = await fetch(`${GRAPH_BASE}/${formId}?fields=questions&access_token=${accessToken}`);
    if (!res.ok) return map;
    const data = await res.json() as { questions?: { key: string; label: string }[] };
    for (const q of data.questions ?? []) {
      if (q.key && q.label) map.set(q.key, q.label);
    }
    formQuestionsCache.set(formId, map);
  } catch {
    // 라벨 조회 실패 시 기본값 그대로 반환
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
}

export function buildLeadSlackText({ leadData, localTz, labels }: SlackLeadMessage): string {
  const createdUtc = leadData.created_time ? new Date(leadData.created_time) : new Date();

  const kstStr = toIsoWithOffset(createdUtc, 'Asia/Seoul');
  const localStr = localTz ? `${toIsoWithOffset(createdUtc, localTz)} (${localTz})` : '알 수 없음';

  const adName = leadData.ad_name ?? '없음';
  const campaignName = leadData.campaign_name ?? '없음';

  const fieldLines = (leadData.field_data ?? []).map(f => {
    const label = labels.get(f.name) ?? f.name;
    const value = f.values.join(', ');
    const display = label === '연락처' ? `p:${value}` : value;
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

// ── Slack Incoming Webhook 전송 ──────────────────────────────────────────────────

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
