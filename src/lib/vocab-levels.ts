/**
 * SAT Vocabulary Level Framework (Level 1–10)
 * Based on sat_vocabulary_level_framework.md
 * SAT Reading passages most frequently use Level 6–8 vocabulary.
 */

export interface VocabLevelDef {
  description: string;
  examples: string[];
}

export const VOCAB_LEVELS: Record<number, VocabLevelDef> = {
  4: {
    description: 'high school general vocabulary — commonly used in textbooks and explanatory writing',
    examples: ['illustrate', 'emphasize', 'determine', 'complex', 'significant'],
  },
  5: {
    description: 'advanced high school vocabulary — frequent in analytical writing and formal explanations',
    examples: ['infer', 'derive', 'interpret', 'evaluate', 'attribute'],
  },
  6: {
    description: 'academic vocabulary — common in research explanations and analytical texts',
    examples: ['constitute', 'constrain', 'indicate', 'assume', 'factor'],
  },
  7: {
    description: 'SAT core academic vocabulary — frequently appearing in SAT Reading passages and academic arguments',
    examples: ['mitigate', 'consolidate', 'reinforce', 'justify', 'assess'],
  },
  8: {
    description: 'advanced academic vocabulary — present in higher-level academic texts',
    examples: ['delineate', 'corroborate', 'substantiate', 'articulate', 'reconcile'],
  },
  9: {
    description: 'rare academic vocabulary — found in complex literary or scholarly texts',
    examples: ['desultory', 'pellucid', 'tenuous', 'obscure', 'intricate'],
  },
};

/**
 * Maps question difficulty to a representative vocabulary level.
 * Difficulty reflects question complexity; vocab level approximates word sophistication.
 */
export function difficultyToLevel(difficulty: string): number {
  switch (difficulty) {
    case 'Easy':   return 5;
    case 'Medium': return 7;
    case 'Hard':   return 8;
    default:       return 7;
  }
}

export function getMedianLevel(levels: number[]): number {
  if (levels.length === 0) return 7;
  const sorted = [...levels].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export function getLevelDef(level: number): VocabLevelDef {
  // Clamp to defined range (4–9)
  const clamped = Math.max(4, Math.min(9, level));
  return VOCAB_LEVELS[clamped];
}
