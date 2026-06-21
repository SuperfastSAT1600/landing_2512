/**
 * 상담 메모 정성 신호 추출 — 정량 KPI가 못 보는 "왜 막히는가"를 메모에서 캔다.
 * 코호트 = 정체(active + SLA 초과) + 이번 달 이탈 리드. 이들의 consultation_timeline을
 * Haiku 1패스로 압축해 반복 패턴(이의·경쟁사·니즈 불일치·이탈 맥락)만 신호로 뽑는다.
 * 결과는 deep 인사이트 생성기에 [상담 메모 신호] 블록으로 주입된다. 실패/메모 0건이면 빈 블록으로 degrade.
 */
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  isStageStalled,
  kstDateStr,
  FUNNEL_STAGE_LABELS,
  type ConsultationEntry,
  type FunnelStage,
} from '@/types/crm';

const MODEL = 'claude-haiku-4-5';
const MAX_LEADS = 40; // 비용 가드: 분석 리드 수 상한 (정체 우선, 이탈 보충)
const MAX_ENTRIES_PER_LEAD = 4; // 리드당 최신 메모 수
const MAX_CHARS_PER_ENTRY = 280; // 메모 1건 글자 수 상한

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

const EXTRACT_SYSTEM = `너는 SuperfastSAT 상담 메모 분석가다. 아래 [리드별 상담 메모]에서 **여러 리드에 걸쳐 반복되는 패턴**만 뽑아라.
주목할 유형: (1) 반복 이의·거절 사유(가격·시기·신뢰·효과 의심), (2) 경쟁사·대안 언급, (3) 고객이 원하는 것과 우리 오퍼·안내의 불일치, (4) 이탈·정체로 이어진 공통 맥락.
규칙: 1회성·개별 사정은 버린다. 각 패턴은 "- [유형] 한 줄 요약 (n건): \\"대표 인용 1개\\"" 형식 한 줄. 추측 금지(메모에 있는 것만). 한국어, 최대 8줄. 머리말·JSON·코드펜스 금지. 반복 패턴이 없으면 정확히 "뚜렷한 반복 패턴 없음"만 출력.`;

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

/** 코호트 리드별 메모를 토큰 예산 내 압축 텍스트로 직렬화(순수). */
export function serializeMemos(rows: CohortRow[]): string {
  return rows
    .map((row) => {
      const label = FUNNEL_STAGE_LABELS[row.funnel_stage] ?? row.funnel_stage;
      const state = row.lead_status === 'active' ? '정체' : '이탈';
      const entries = (row.consultation_timeline ?? [])
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, MAX_ENTRIES_PER_LEAD)
        .map((e) => (e.ai_purified || e.raw_memo || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS_PER_ENTRY))
        .filter(Boolean);
      if (entries.length === 0) return '';
      return `· [${state}·${label}] ${entries.join(' / ')}`;
    })
    .filter(Boolean)
    .join('\n');
}

export interface MemoSignals {
  memoBlock: string; // 프롬프트 주입용 [상담 메모 신호] 블록 (없으면 '')
  leadCount: number;
}

/**
 * 정체·이탈 리드 메모에서 반복 정성 신호를 추출한다.
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
  if (!serialized) return { memoBlock: '', leadCount: 0 };

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: [{ type: 'text', text: EXTRACT_SYSTEM }],
      messages: [{ role: 'user', content: `[리드별 상담 메모]\n${serialized}` }],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('')
      .trim();
    if (!text || text.includes('뚜렷한 반복 패턴 없음')) {
      return { memoBlock: '', leadCount: rows.length };
    }
    const memoBlock = `[상담 메모 신호 · 이번 달 인입 리드 중 정체/이탈 ${rows.length}명 분석]\n${text}`;
    return { memoBlock, leadCount: rows.length };
  } catch (err) {
    console.error('[strategy-memos] extraction failed (degrading):', err);
    return { memoBlock: '', leadCount: rows.length };
  }
}
