import type { ReportInsights, SectionInsight } from './report-insights';

/**
 * Deep-merge edited insights over AI-generated insights.
 * Edited fields override; unedited fields retain AI values.
 * Returns a new object — does not mutate inputs.
 */
export function mergeInsights(
  ai: ReportInsights,
  edited: Partial<ReportInsights> | null | undefined,
): ReportInsights {
  if (!edited) return ai;

  const sections: Record<string, SectionInsight> = { ...ai.sections };
  if (edited.sections) {
    for (const [name, override] of Object.entries(edited.sections)) {
      if (override && sections[name]) {
        sections[name] = { ...sections[name], ...override };
      } else if (override) {
        sections[name] = override;
      }
    }
  }

  return {
    executiveSummary: edited.executiveSummary ?? ai.executiveSummary,
    sections,
    topWeakDomains: edited.topWeakDomains ?? ai.topWeakDomains,
    behavioral: edited.behavioral ?? ai.behavioral,
    vocabulary: edited.vocabulary !== undefined ? edited.vocabulary : ai.vocabulary,
    keyRecommendations: edited.keyRecommendations ?? ai.keyRecommendations,
  };
}

/**
 * Returns the set of top-level keys that have been edited.
 * Used to show "튜터 검수 완료" badge on edited fields.
 */
export function getEditedFieldKeys(
  edited: Partial<ReportInsights> | null | undefined,
): Set<string> {
  if (!edited) return new Set();
  return new Set(Object.keys(edited));
}
