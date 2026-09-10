import type { WinbackPlay } from '@/types/crm';
import type { BriefDraft } from './steps/BriefStep';
import { EMPTY_BRIEF } from './steps/BriefStep';
import type { RuleDraft } from './WinbackRuleFilters';
import { EMPTY_RULES } from './WinbackRuleFilters';

export function playToBriefDraft(play: WinbackPlay): BriefDraft {
  return {
    ...EMPTY_BRIEF,
    title: play.title,
    product_brief: play.product_brief,
    product_category: play.product_category ?? '',
    product_price: play.product_price == null ? '' : String(play.product_price),
    product_hours: play.product_hours == null ? '' : String(play.product_hours),
    target_exam_date: play.target_exam_date ?? '',
    audience_hint: play.audience_hint ?? '',
    conversion_window_days: String(play.conversion_window_days),
    contact_cooldown_days: String(play.contact_cooldown_days),
  };
}

export function playToRuleDraft(play: WinbackPlay): RuleDraft {
  const filters = play.rule_filters ?? {};
  return {
    ...EMPTY_RULES,
    grades: filters.grades ?? [],
    schoolTypes: filters.school_types ?? [],
    churnTagPrefixes: filters.churn_tag_prefixes ?? [],
    churnedAfterDays: filters.churned_after_days == null ? '' : String(filters.churned_after_days),
    churnedWithinDays: filters.churned_within_days == null ? '' : String(filters.churned_within_days),
    excludeRecentContactDays:
      filters.exclude_recent_contact_days == null ? '' : String(filters.exclude_recent_contact_days),
    campaignTagKeyword: filters.campaign_tag_any?.[0] ?? '',
  };
}
