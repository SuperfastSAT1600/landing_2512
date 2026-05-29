import type { CreateStudentInput } from '@/types/crm';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SheetsSyncPayload {
  source_tab:
    | 'META리드_인스턴트폼'
    | 'META리드_인스턴트폼_목표시험'
    | 'AP수업 문의'
    | 'SuperTest 수요조사'
    | 'tutoring_landing'
    | 'instagram'
    | 'landing';
  created_time: string;
  phone: string;
  ad_name?: string;
  adset_name?: string;
  platform?: 'ig' | 'fb';
  student_name?: string;   // 랜딩페이지 탭: 실제 학생 이름 포함
  grade?: string;
  target_score_text?: string;
  target_test_date_text?: string;
  ap_subject?: string;
  supertest_date?: string;
}

// ─── REQ-002: 전화번호 정규화 ────────────────────────────────────────────────

export function normalizePhone(phone: string): string {
  const cleaned = phone.trim();

  // 한국 번호 (+82 또는 82 접두사)
  if (cleaned.startsWith('+82') || cleaned.match(/^82\d/)) {
    const digits = cleaned.replace(/^\+?82/, '').replace(/[\s\-]/g, '');
    return '0' + digits;
  }

  // 010- 또는 010 으로 시작하는 일반 번호
  if (cleaned.match(/^0\d/)) {
    return cleaned.replace(/[\s\-]/g, '');
  }

  // 해외 번호(+1, +86 등) — 그대로 반환 (공백·하이픈만 제거)
  return cleaned.replace(/[\s\-]/g, '');
}

// ─── REQ-004: 자동 이름 생성 ─────────────────────────────────────────────────

const TAB_PREFIX_MAP: Record<string, string> = {
  'META리드_인스턴트폼': 'META리드',
  'META리드_인스턴트폼_목표시험': 'META목표시험',
  'AP수업 문의': 'AP문의',
  'SuperTest 수요조사': 'SuperTest',
  'tutoring_landing': '튜터링랜딩',
  'instagram': '인스타그램',
  'landing': '랜딩',
};

export function generateLeadName(sourceTab: string, createdTime: string): string {
  const prefix = TAB_PREFIX_MAP[sourceTab] ?? '리드';
  const date = createdTime.slice(0, 10).replace(/-/g, '');
  return `${prefix}_${date}`;
}

// ─── REQ-005: 학년 정규화 ────────────────────────────────────────────────────

export function normalizeGrade(grade: string): string {
  if (!grade) return '기타';

  const s = grade.toLowerCase().trim();

  // 한국 고등학교: 고1=10, 고2=11, 고3=12
  const koHigh = s.match(/고\s*([123])/);
  if (koHigh) return `${9 + Number(koHigh[1])}th`;

  // 한국 중학교: 중1=7, 중2=8, 중3=9
  const koMid = s.match(/중\s*([123])/);
  if (koMid) return `${6 + Number(koMid[1])}th`;

  // junior = 11th, senior = 12th, sophomore = 10th, freshman = 9th
  if (s.includes('junior')) return '11th';
  if (s.includes('senior')) return '12th';
  if (s.includes('sophomore')) return '10th';
  if (s.includes('freshman')) return '9th';

  // G7–G12 / y9 / 9학년 / grade 9 패턴에서 숫자 추출
  const numMatch = s.match(/(?:g|y|grade\s*)(\d+)/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (n >= 7 && n <= 12) return `${n}th`;
  }

  // 숫자+학년 패턴: "9학년", "10학년"
  const gradeNum = s.match(/(\d+)\s*(?:학년|th|st|nd|rd)?/);
  if (gradeNum) {
    const n = Number(gradeNum[1]);
    if (n >= 7 && n <= 12) return `${n}th`;
  }

  return '기타';
}

// ─── REQ-006: 목표점수 정규화 ────────────────────────────────────────────────

export function normalizeTargetScore(text: string | undefined): number | null {
  if (!text) return null;

  if (text === '만점') return 1600;

  // 비정형 키워드
  const nonNumericKeywords = ['모름', '고득점', '상위권', '없음', '처음', '아직', 'na', 'n.a', '모르', '잘모', '없어', '처음'];
  const lower = text.toLowerCase();
  if (nonNumericKeywords.some((kw) => lower.includes(kw))) return null;

  // "1570-1600" → 1570 (하한)
  const rangeMatch = text.match(/(\d{3,4})\s*[-~]\s*\d{3,4}/);
  if (rangeMatch) return Number(rangeMatch[1]);

  // 첫 번째 3–4자리 숫자 추출 ("1500+", "1400이상", "1550점", "1600^^")
  const numMatch = text.match(/(\d{3,4})/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (n >= 400 && n <= 1600) return n;
  }

  return null;
}

// ─── REQ-007: 목표시험날짜 매핑 ─────────────────────────────────────────────

const TEST_DATE_MAP: Record<string, string> = {
  '26년_5월_시험': '2026-05-03',
  '26년_6월_시험': '2026-06-07',
  '26년_8월_시험': '2026-08-23',
  '26년_9월_시험': '2026-09-13',
  '27년_상반기_시험': '2027-03-08',
  '27년_하반기_시험': '2027-08-22',
};

export function mapTestDateText(text: string | undefined): string | null {
  if (!text) return null;

  // 정확히 맞는 키 먼저
  if (TEST_DATE_MAP[text]) return TEST_DATE_MAP[text];

  // 4분기 패턴 (괄호 포함 가능)
  if (text.includes('4분기')) return '2026-10-04';

  return null;
}

// ─── REQ-008: 탭별 필드 매핑 → CRM payload ──────────────────────────────────

type TabMeta = {
  inquiryChannel: import('@/types/crm').InquiryChannel;
  trafficSource: import('@/types/crm').TrafficSource;
};

const TAB_META: Record<SheetsSyncPayload['source_tab'], TabMeta> = {
  'META리드_인스턴트폼':          { inquiryChannel: '인스타그램 링크', trafficSource: '인스타그램 광고' },
  'META리드_인스턴트폼_목표시험': { inquiryChannel: '인스타그램 링크', trafficSource: '인스타그램 광고' },
  'AP수업 문의':                   { inquiryChannel: '인스타그램 링크', trafficSource: '인스타그램 광고' },
  'SuperTest 수요조사':            { inquiryChannel: '인스타그램 링크', trafficSource: '인스타그램 광고' },
  'tutoring_landing':              { inquiryChannel: '구글 상담시트',   trafficSource: '튜터링 랜딩페이지' },
  'instagram':                     { inquiryChannel: '인스타그램 링크', trafficSource: '인스타그램 오가닉' },
  'landing':                       { inquiryChannel: '구글 상담시트',   trafficSource: '(구)랜딩페이지' },
};

export function buildCrmPayload(p: SheetsSyncPayload): CreateStudentInput {
  const normalizedPhone = normalizePhone(p.phone);
  const name = p.student_name?.trim() || generateLeadName(p.source_tab, p.created_time);
  const inquiryDate = p.created_time.slice(0, 10);
  const { inquiryChannel, trafficSource } = TAB_META[p.source_tab];

  let campaignTags: string[] = [];
  let targetTestDate: string | null = null;
  const targetScore = normalizeTargetScore(p.target_score_text);
  const grade = normalizeGrade(p.grade ?? '');

  switch (p.source_tab) {
    case 'META리드_인스턴트폼':
      campaignTags = ['META 리드'];
      break;

    case 'META리드_인스턴트폼_목표시험':
      campaignTags = ['META 리드', '목표시험 조사'];
      targetTestDate = mapTestDateText(p.target_test_date_text);
      break;

    case 'AP수업 문의':
      campaignTags = ['AP 문의', p.ap_subject ?? ''].filter(Boolean);
      break;

    case 'SuperTest 수요조사':
      campaignTags = ['SuperTest 수요조사', p.supertest_date ?? ''].filter(Boolean);
      break;

    case 'tutoring_landing':
      campaignTags = ['튜터링 랜딩'].filter(Boolean);
      break;

    case 'instagram':
      campaignTags = ['인스타그램 오가닉'].filter(Boolean);
      break;

    case 'landing':
      campaignTags = ['랜딩페이지'].filter(Boolean);
      break;
  }

  return {
    name,
    grade,
    school_type: '한국 학제',
    parent_phone: normalizedPhone,
    contact_type: 'phone',
    inquiry_date: inquiryDate,
    inquiry_channel: inquiryChannel,
    traffic_source: trafficSource,
    content_author: null,
    lead_type: 'B2C',
    b2b_partner: null,
    campaign_tags: campaignTags,
    ad_name: p.ad_name ?? null,
    adset_name: p.adset_name ?? null,
    previous_rw_score: null,
    previous_math_score: null,
    previous_score_status: 'never_taken',
    target_score: targetScore,
    target_score_2: null,
    target_test_date: targetTestDate,
    target_test_date_2: null,
    desired_subjects: 'Both',
    parent_timezone: null,
  };
}
