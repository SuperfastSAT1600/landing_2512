/**
 * 추천 후보 사전필터 — SQL로 걸 수 있는 조건과 JS로만 걸 수 있는 조건을 분리한다.
 *
 * SQL: lead_status / grade / school_type / churn_type / traffic_source
 * JS : effectiveChurnStage(파생값), 이탈 경과일(inactive_at 기준), 최근 컨택, churn_tag 접두,
 *      campaign_tags 부분일치, 쿨다운·기존 타겟 제외(다른 테이블 조회 결과)
 *
 * campaign_tags를 SQL(overlaps)에서 JS로 내린 이유: overlaps는 배열 원소 **완전일치**라
 * "AP"처럼 키워드를 넣으면 'AP 문의'조차 못 잡고 조용히 0명이 된다. 담당자가 함정에 빠지는
 * 대표 입력이었다. 풀 전체를 어차피 메모리로 읽으므로 부분일치는 JS에서 하는 게 맞다.
 */
import type { WinbackRuleFilters } from '@/types/crm';
import { classifyChurnTag } from '@/lib/churn-breakdown';
import { effectiveChurnStage } from '@/lib/funnel-stats';
import { churnedDaysOf } from '@/lib/winback/recency';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PrefilterPlan {
  statuses: string[];
  grades?: string[];
  schoolTypes?: string[];
  churnTypes?: string[];
  trafficSources?: string[];
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
  };
}

export interface JsFilterRow {
  id: string;
  campaign_tags?: string[] | null;
  /** 이탈 전환 시점(마이그레이션 116). 없으면 updated_at으로 폴백한다. */
  inactive_at?: string | null;
  updated_at: string;
  last_contacted_at?: string | null;
  churn_tag?: string | null;
  churn_stage_manual?: string | null;
  stage_history?: { stage: string }[] | null;
}

export function applyJsFilters<T extends JsFilterRow>(
  rows: T[],
  rules: WinbackRuleFilters,
  ctx: { now: number; excludeIds?: Set<string> }
): T[] {
  return rows.filter((row) => {
    if (ctx.excludeIds?.has(row.id)) return false;

    const days = churnedDaysOf(row, ctx.now);
    if (rules.churned_after_days != null && days < rules.churned_after_days) return false;
    if (rules.churned_within_days != null && days > rules.churned_within_days) return false;

    if (rules.exclude_recent_contact_days != null && row.last_contacted_at) {
      const sinceContact = (ctx.now - new Date(row.last_contacted_at).getTime()) / DAY_MS;
      if (sinceContact <= rules.exclude_recent_contact_days) return false;
    }

    if (rules.campaign_tag_any?.length) {
      const tags = (row.campaign_tags ?? []).map((t) => t.toLowerCase());
      const wanted = rules.campaign_tag_any.map((t) => t.trim().toLowerCase()).filter(Boolean);
      if (!wanted.some((w) => tags.some((t) => t.includes(w)))) return false;
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
