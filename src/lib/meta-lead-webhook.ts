import { createHmac, timingSafeEqual } from 'crypto';

export interface MetaLeadField {
  name: string;
  values: string[];
}

export interface MetaLeadData {
  id: string;
  field_data: MetaLeadField[];
}

export interface ParsedLeadFields {
  name: string | null;
  phone: string | null;
}

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

/** Meta Graph API에서 leadgen_id로 폼 필드 데이터 조회 */
export async function fetchMetaLeadData(leadgenId: string, accessToken: string): Promise<MetaLeadData> {
  const url = `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta Graph API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<MetaLeadData>;
}

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
