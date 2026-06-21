/**
 * 상담 메모 정성 신호 추출 — 정량 KPI가 못 보는 "왜 막히는가"를 메모에서 캔다.
 * 코호트 = 이번 달 인입 리드 중 정체(active + SLA 초과) + 이탈. 이들의 consultation_timeline에서
 * 반복 패턴(이의·경쟁사·니즈 불일치·이탈 맥락)을 신호로 뽑는다.
 *
 * 하이브리드 방식: LLM(Haiku)은 잘하는 일만 한다 — 테마·대표 인용·매칭 키워드 발견.
 * **건수는 코드가 키워드로 결정론적으로 다시 센다**(LLM이 눈대중으로 세 흔들리는 문제 제거).
 * 결과는 deep 인사이트 생성기에 [상담 메모 신호] 블록으로 주입. 실패/메모 0건이면 빈 블록 degrade.
 */
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  isStageStalled,
  kstDateStr,
  type ConsultationEntry,
  type FunnelStage,
} from '@/types/crm';

const MODEL = 'claude-haiku-4-5';
const MAX_LEADS = 40; // 비용 가드: 분석 리드 수 상한 (정체 우선, 이탈 보충)
const MAX_ENTRIES_PER_LEAD = 4; // Haiku 입력용: 리드당 최신 메모 수
const MAX_CHARS_PER_ENTRY = 280; // Haiku 입력용: 메모 1건 글자 수 상한
const MAX_CHARS_PER_LEAD = 5000; // 카운트용: 리드당 전체 메모 텍스트 상한
const MIN_PATTERN_COUNT = 2; // 이 미만이면 "반복 패턴"이 아니므로 제외
const MAX_SIGNALS = 8; // 최종 신호 줄 수 상한
const NON_DISTINCT_SHARE = 0.55; // 코호트의 이 비율 초과로 매칭되는 키워드는 '퍼널 보편어'로 보고 무시

const COLS =
  'id, name, funnel_stage, funnel_stage_updated_at, created_at, lead_status, consultation_timeline';

export interface CohortRow {
  id: string;
  name: string | null;
  funnel_stage: FunnelStage;
  funnel_stage_updated_at: string | null;
  created_at: string;
  lead_status: string;
  consultation_timeline: ConsultationEntry[] | null;
}

export interface RawTheme {
  label: string; // 패턴 분류 (예: '진단 미진행')
  summary: string; // 한 줄 요약
  quote: string; // 대표 인용 1개
  keywords: string[]; // 이 패턴이 든 메모를 찾아낼 핵심 키워드
}

const EXTRACT_SYSTEM = `너는 SuperfastSAT 상담 메모 분석가다. 아래 [리드별 상담 메모]에서 **여러 리드에 걸쳐 반복되는 패턴**만 뽑아라.
주목할 유형: (1) 반복 이의·거절 사유(가격·시기·신뢰·효과 의심), (2) 경쟁사·대안 언급, (3) 고객이 원하는 것과 우리 오퍼·안내의 불일치, (4) 이탈·정체로 이어진 공통 맥락.

각 패턴을 **한 줄**로, 필드는 정확히 " ||| "(공백+막대3개+공백)로 구분해 출력하라:
라벨 ||| 한 줄 요약 ||| 메모 원문 그대로의 대표 인용 1개 ||| 키워드1 ;; 키워드2 ;; 키워드3
- **키워드는 매우 중요하다**: 코드가 이 키워드를 메모 본문에서 **글자 그대로(부분 문자열) 검색**해 건수를 센다. 규칙:
  (1) 메모에 **실제로 등장한 글자**를 복사하라(띄어쓰기까지 동일). 요약·동의어·새 표현(예: '미제출','즉시거부') 절대 금지.
  (2) **가능한 짧게** — 표현이 조금씩 달라도 여러 메모에서 잡히도록 핵심어만(2~6자 권장). 긴 문장 조각은 한 명만 잡히니 금지.
     좋음: 리마인드 ;; 베테랑스 ;; 셀린 ;; 1500 ;; 학기중   /   나쁨: "1500점대가 나올지 걱정"(너무 긺), "진단 테스트 진행되지 않아 리마인드"(너무 긺)
  (3) 한 패턴에 2~6개를 " ;; "로. "학생"·"수업"·"진단 테스트"처럼 거의 모든 메모에 있는 흔한 말 금지.
- 건수는 적지 마라(코드가 센다). 추측 금지(메모에 있는 것만). 1회성·개별 사정은 버린다.
- 한 줄에 한 패턴. 번호·머리말·JSON·코드펜스·따옴표 감싸기 금지. 반복 패턴이 없으면 빈 출력.`;

/**
 * 정체 후보(active 전체) + 이번 달 이탈 행을 받아 분석 코호트를 추린다(순수).
 * 정체(SLA 초과) 우선 + 이탈 보충, id 중복 제거, 메모 있는 리드만, MAX_LEADS 상한.
 */
export function pickCohort(activeRows: CohortRow[], churnedRows: CohortRow[], nowMs: number): CohortRow[] {
  const stalled = activeRows.filter((s) => isStageStalled(s, nowMs));
  const seen = new Set<string>();
  const merged: CohortRow[] = [];
  for (const row of [...stalled, ...churnedRows]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    if ((row.consultation_timeline ?? []).length === 0) continue;
    merged.push(row);
    if (merged.length >= MAX_LEADS) break;
  }
  return merged;
}

/**
 * 정체(active+SLA초과) + 이번 달 이탈 리드를 합쳐 메모 있는 코호트로 추린다.
 * 정량([KPI 건강 진단])과 같은 모수를 보도록 둘 다 "이번 달 인입(inquiry_date)" 리드로 한정.
 */
async function fetchCohort(nowMs: number): Promise<CohortRow[]> {
  const monthStart = `${kstDateStr(nowMs).slice(0, 7)}-01`;
  const [activeRes, churnedRes] = await Promise.all([
    supabaseAdmin.from('students').select(COLS).eq('lead_status', 'active').gte('inquiry_date', monthStart),
    supabaseAdmin
      .from('students')
      .select(COLS)
      .or('funnel_stage.eq.churned,lead_status.eq.inactive')
      .gte('inquiry_date', monthStart),
  ]);
  return pickCohort((activeRes.data ?? []) as CohortRow[], (churnedRes.data ?? []) as CohortRow[], nowMs);
}

/** 리드별 메모 전체를 카운트용 한 덩어리 텍스트로(소문자, 공백 정규화). 순수. */
export function leadTexts(rows: CohortRow[]): string[] {
  return rows.map((row) =>
    (row.consultation_timeline ?? [])
      .map((e) => e.ai_purified || e.raw_memo || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .slice(0, MAX_CHARS_PER_LEAD)
      .toLowerCase(),
  );
}

/** 키워드 중 하나라도 포함한 리드 수를 결정론적으로 센다(리드당 1회). 순수. */
export function countLeads(texts: string[], keywords: string[]): number {
  const kws = keywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
  if (kws.length === 0) return 0;
  return texts.filter((t) => kws.some((k) => t.includes(k))).length;
}

/**
 * 변별력 없는 키워드(코호트 절반 이상에 등장 = '진단 테스트'처럼 퍼널 보편어)를 제거. 순수.
 * substring 매칭이 패턴과 그 반대('진행 완료' vs '진행 안 됨')를 구분 못 하는 한계를 보정한다.
 */
export function distinctiveKeywords(texts: string[], keywords: string[]): string[] {
  const ceiling = Math.max(MIN_PATTERN_COUNT, Math.floor(texts.length * NON_DISTINCT_SHARE));
  return keywords.filter((k) => countLeads(texts, [k]) <= ceiling);
}

/**
 * 라인 구분 응답을 파싱. 순수. 한 줄 = "라벨 ||| 요약 ||| 인용 ||| kw ;; kw".
 * 잘린 줄(필드 4개 미만)·머리말은 버린다 → 토큰 truncation·따옴표에 강건(JSON처럼 전체가 깨지지 않음).
 */
export function parseThemes(text: string): RawTheme[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*[-*\d.)\s]+/, '').trim()) // 번호·불릿 머리 제거
    .filter((l) => l.includes('|||'))
    .map((line) => {
      const parts = line.split('|||').map((p) => p.trim());
      if (parts.length < 4) return null; // 잘린 줄 폐기
      const [label, summary, quote, kwRaw] = parts;
      const keywords = kwRaw.split(';;').map((k) => k.trim()).filter(Boolean);
      if (!label || !summary || !quote || keywords.length === 0) return null;
      return { label, summary, quote, keywords };
    })
    .filter((t): t is RawTheme => t !== null);
}

/**
 * 테마별로 코드가 센 리드 수를 붙여 [상담 메모 신호] 본문을 만든다(순수).
 * MIN_PATTERN_COUNT 미만(매칭 0~1건)은 노이즈/환각으로 보고 버린다. 건수 내림차순.
 */
export function buildSignalLines(themes: RawTheme[], texts: string[]): string {
  return themes
    .map((t) => ({ t, n: countLeads(texts, distinctiveKeywords(texts, t.keywords)) }))
    .filter(({ n }) => n >= MIN_PATTERN_COUNT)
    .sort((a, b) => b.n - a.n)
    .slice(0, MAX_SIGNALS)
    .map(({ t, n }) => `- [${t.label}] ${t.summary} (${n}건): "${t.quote}"`)
    .join('\n');
}

/** Haiku 입력용: 코호트 리드별 메모를 토큰 예산 내 압축 텍스트로 직렬화(순수). */
export function serializeMemos(rows: CohortRow[]): string {
  return rows
    .map((row) => {
      const state = row.lead_status === 'active' ? '정체' : '이탈';
      const entries = (row.consultation_timeline ?? [])
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, MAX_ENTRIES_PER_LEAD)
        .map((e) => (e.ai_purified || e.raw_memo || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS_PER_ENTRY))
        .filter(Boolean);
      if (entries.length === 0) return '';
      return `· [${state}·${row.funnel_stage}] ${entries.join(' / ')}`;
    })
    .filter(Boolean)
    .join('\n');
}

export interface MemoSignals {
  memoBlock: string; // 프롬프트 주입용 [상담 메모 신호] 블록 (없으면 '')
  leadCount: number;
}

/**
 * 정체·이탈 리드 메모에서 반복 정성 신호를 추출한다(하이브리드: LLM 발견 + 코드 카운트).
 * API 키 없음 / 코호트 없음 / 실패 시 빈 블록으로 degrade (정량만으로도 배너는 동작).
 */
export async function buildMemoSignals(nowMs: number = Date.now()): Promise<MemoSignals> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { memoBlock: '', leadCount: 0 };

  let rows: CohortRow[];
  try {
    rows = await fetchCohort(nowMs);
  } catch (err) {
    console.error('[strategy-memos] cohort fetch failed (degrading):', err);
    return { memoBlock: '', leadCount: 0 };
  }
  if (rows.length === 0) return { memoBlock: '', leadCount: 0 };

  const serialized = serializeMemos(rows);
  if (!serialized) return { memoBlock: '', leadCount: rows.length };

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: [{ type: 'text', text: EXTRACT_SYSTEM }],
      messages: [{ role: 'user', content: `[리드별 상담 메모]\n${serialized}` }],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('');
    // LLM은 테마·인용·키워드만 발견 → 건수는 코드가 키워드로 결정론적으로 카운트
    const themes = parseThemes(text);
    const body = buildSignalLines(themes, leadTexts(rows));
    if (!body) return { memoBlock: '', leadCount: rows.length };
    const memoBlock = `[상담 메모 신호 · 이번 달 인입 리드 중 정체/이탈 ${rows.length}명 분석]\n${body}`;
    return { memoBlock, leadCount: rows.length };
  } catch (err) {
    console.error('[strategy-memos] extraction failed (degrading):', err);
    return { memoBlock: '', leadCount: rows.length };
  }
}
