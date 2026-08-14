/**
 * 추천 후보 사전필터 — SQL로 걸 수 있는 조건과 JS로만 걸 수 있는 조건을 분리한다.
 *
 * SQL: lead_status / grade / school_type / churn_type / traffic_source / campaign_tags overlap
 * JS : effectiveChurnStage(파생값), 이탈 경과일(updated_at proxy), 최근 컨택, churn_tag 접두,
 *      쿨다운·기존 타겟 제외(다른 테이블 조회 결과)
 */
import type { WinbackRuleFilters } from '@/types/crm';
import { classifyChurnTag } from '@/lib/churn-breakdown';
import { effectiveChurnStage } from '@/lib/funnel-stats';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PrefilterPlan {
  statuses: string[];
  grades?: string[];
  schoolTypes?: string[];
  churnTypes?: string[];
  trafficSources?: string[];
  campaignTagAny?: string[];
}

/** 빈 배열은 조건 자체를 만들지 않는다(전체 허용). */
function nonEmpty<T>(arr?: T[]): T[] | undefined {
  return arr && arr.length > 0 ? arr : undefined;
}

export function buildPrefilter(rules: WinbackRuleFilters): PrefilterPlan {
  const includeReactivating = rules.include_reactivating !== false;
  return {
    statuses: includeReactivating ? ['inactive', 'reactivating'] : ['inactive'],
    grades: nonEmpty(rules.grades),
    schoolTypes: nonEmpty(rules.school_types),
    churnTypes: nonEmpty(rules.churn_types),
    trafficSources: nonEmpty(rules.traffic_sources),
    campaignTagAny: nonEmpty(rules.campaign_tag_any),
  };
}

export interface JsFilterRow {
  id: string;
  updated_at: string;
  last_contacted_at?: string | null;
  churn_tag?: string | null;
  churn_stage_manual?: string | null;
  stage_history?: { stage: string }[] | null;
}

/** 이탈 경과일 — updated_at이 lead_status 변경 시 갱신되므로 이탈 시점 proxy로 쓴다. */
function churnedDays(row: JsFilterRow, now: number): number {
  return (now - new Date(row.updated_at).getTime()) / DAY_MS;
}

export function applyJsFilters<T extends JsFilterRow>(
  rows: T[],
  rules: WinbackRuleFilters,
  ctx: { now: number; excludeIds?: Set<string> }
): T[] {
  return rows.filter((row) => {
    if (ctx.excludeIds?.has(row.id)) return false;

    const days = churnedDays(row, ctx.now);
    if (rules.churned_after_days != null && days < rules.churned_after_days) return false;
    if (rules.churned_within_days != null && days > rules.churned_within_days) return false;

    if (rules.exclude_recent_contact_days != null && row.last_contacted_at) {
      const sinceContact = (ctx.now - new Date(row.last_contacted_at).getTime()) / DAY_MS;
      if (sinceContact <= rules.exclude_recent_contact_days) return false;
    }

    if (rules.churn_tag_prefixes?.length) {
      const tag = row.churn_tag?.trim();
      if (!tag) return false;
      const { category } = classifyChurnTag(tag);
      if (!rules.churn_tag_prefixes.includes(category)) return false;
    }

    if (rules.churn_stages?.length) {
      const stage = effectiveChurnStage(row);
      if (!stage || !rules.churn_stages.includes(stage)) return false;
    }

    return true;
  });
}
