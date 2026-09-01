/**
 * 추천 후보 조회 — 이탈풀에서 규칙 사전필터를 통과한 학생과 부가 신호(과거 결제·쿨다운)를 모은다.
 * Supabase 접근이 있어 순수 함수가 아니라 별도 모듈로 분리했다(라우트를 얇게 유지).
 */
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { WinbackRuleFilters } from '@/types/crm';
import { applyJsFilters, buildPrefilter } from '@/lib/winback/prefilter';

const FETCH_PAGE = 500; // Supabase 1000행 캡 회피
const PAYMENT_CHUNK = 150;

export const CANDIDATE_COLUMNS =
  'id, name, grade, school_type, campaign_tags, churn_type, churn_tag, churn_stage_manual, ' +
  'stage_history, traffic_source, previous_rw_score, previous_math_score, target_score, ' +
  'target_test_date, last_contacted_at, inactive_at, updated_at, lead_status, consultation_timeline, ' +
  'reactivation_log';

export interface CandidateRow {
  id: string;
  name: string;
  grade?: string | null;
  updated_at: string;
  [key: string]: unknown;
}

/** 규칙 사전필터(SQL 부분)로 이탈풀 후보를 페이지 단위로 모두 읽는다. */
async function fetchByRules(rules: WinbackRuleFilters): Promise<CandidateRow[]> {
  const plan = buildPrefilter(rules);
  const rows: CandidateRow[] = [];

  for (let from = 0; ; from += FETCH_PAGE) {
    let query = supabaseAdmin
      .from('students')
      .select(CANDIDATE_COLUMNS)
      .in('lead_status', plan.statuses)
      .order('id');

    if (plan.grades) query = query.in('grade', plan.grades);
    if (plan.schoolTypes) query = query.in('school_type', plan.schoolTypes);
    if (plan.churnTypes) query = query.in('churn_type', plan.churnTypes);
    if (plan.trafficSources) query = query.in('traffic_source', plan.trafficSources);

    const { data, error } = await query.range(from, from + FETCH_PAGE - 1);
    if (error) throw new Error(`후보 조회 실패: ${error.message}`);
    if (!data?.length) break;

    rows.push(...(data as unknown as CandidateRow[]));
    if (data.length < FETCH_PAGE) break;
  }

  return rows;
}

/**
 * 최근 발송된 학생(쿨다운) + 이 플레이에 이미 담긴 학생 id.
 * 같은 리드에게 여러 플레이가 연달아 카톡을 보내는 사고를 막는다.
 */
async function fetchExcludedIds(opts: {
  cooldownDays: number;
  playId?: string | null;
}): Promise<Set<string>> {
  const excluded = new Set<string>();

  if (opts.cooldownDays > 0) {
    const since = new Date(Date.now() - opts.cooldownDays * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabaseAdmin
      .from('winback_targets')
      .select('student_id')
      .gte('sent_at', since);
    for (const r of data ?? []) excluded.add((r as { student_id: string }).student_id);
  }

  if (opts.playId) {
    const { data } = await supabaseAdmin
      .from('winback_targets')
      .select('student_id')
      .eq('play_id', opts.playId);
    for (const r of data ?? []) excluded.add((r as { student_id: string }).student_id);
  }

  return excluded;
}

/** 후보들의 과거 결제 상품 카테고리(재구매·업셀 신호). */
async function fetchPaidCategories(studentIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();

  for (let i = 0; i < studentIds.length; i += PAYMENT_CHUNK) {
    const chunk = studentIds.slice(i, i + PAYMENT_CHUNK);
    const { data } = await supabaseAdmin
      .from('payments')
      .select('student_id, product_category')
      .in('student_id', chunk);

    for (const row of (data ?? []) as Array<{ student_id: string | null; product_category: string | null }>) {
      if (!row.student_id || !row.product_category) continue;
      const list = out.get(row.student_id) ?? [];
      if (!list.includes(row.product_category)) list.push(row.product_category);
      out.set(row.student_id, list);
    }
  }

  return out;
}

export interface CandidatePool {
  rows: CandidateRow[];
  paidCategories: Map<string, string[]>;
  prefilteredCount: number;
}

export async function loadCandidatePool(
  rules: WinbackRuleFilters,
  opts: { now: number; cooldownDays: number; playId?: string | null }
): Promise<CandidatePool> {
  const [raw, excludeIds] = await Promise.all([
    fetchByRules(rules),
    fetchExcludedIds({ cooldownDays: opts.cooldownDays, playId: opts.playId }),
  ]);

  const rows = applyJsFilters(raw as (CandidateRow & { updated_at: string })[], rules, {
    now: opts.now,
    excludeIds,
  });

  const paidCategories = await fetchPaidCategories(rows.map((r) => r.id));
  return { rows, paidCategories, prefilteredCount: rows.length };
}
