import { describe, expect, it } from 'vitest';
import { playToBriefDraft, playToRuleDraft } from '../winbackContinuation';

const play = {
  title: 'AP 윈백',
  product_brief: 'AP 수업',
  product_category: 'AP 정규 1:1 수업',
  product_price: 100000,
  product_hours: 10,
  target_exam_date: '2027-05-01',
  audience_hint: '10학년',
  conversion_window_days: 45,
  contact_cooldown_days: 30,
  rule_filters: {
    grades: ['10학년'],
    school_types: ['국제고'],
    churn_tag_prefixes: ['AP'],
    churned_after_days: 10,
    churned_within_days: 90,
    exclude_recent_contact_days: 14,
    campaign_tag_any: ['AP 문의'],
  },
} as never;

describe('winback continuation conversion', () => {
  it('prefills brief and rule drafts from a play', () => {
    expect(playToBriefDraft(play)).toMatchObject({ title: 'AP 윈백', product_price: '100000' });
    expect(playToRuleDraft(play)).toMatchObject({
      grades: ['10학년'],
      schoolTypes: ['국제고'],
      churnedAfterDays: '10',
      campaignTagKeyword: 'AP 문의',
    });
  });

  it('uses empty strings for nullable play fields', () => {
    const draft = playToBriefDraft({ ...(play as object), product_price: null, target_exam_date: null } as never);
    expect(draft.product_price).toBe('');
    expect(draft.target_exam_date).toBe('');
  });
});
