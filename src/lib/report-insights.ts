/**
 * Rule-based insight engine for the SAT diagnostic report.
 * Pure functions — no AI, no side effects.
 * Benchmarks: Top 10% only (Global Average removed).
 */

import { SECTION_BENCHMARKS, DOMAIN_BENCHMARKS } from './report-benchmarks';
import { difficultyToLevel, getMedianLevel, getLevelDef } from './vocab-levels';

export interface SectionInsight {
  headline: string;
  body: string;
  tone: 'strength' | 'opportunity' | 'critical';
}

export interface DomainInsight {
  domain: string;
  delta: number; // vs top 10%
  note: string;
}

export interface ReportInsights {
  executiveSummary: string;
  sections: Record<string, SectionInsight>;
  topWeakDomains: DomainInsight[];
  behavioral: string;
  vocabulary: string | null;
  keyRecommendations: string[];
}

interface Section {
  name: string;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  domainBreakdown: { domain: string; accuracy: number; total: number }[];
}

interface QuestionDetail {
  isCorrect: boolean;
  timeSeconds: number;
  confidence: number;
  flagged: boolean;
  answered: boolean;
}

interface SavedWord {
  word: string;
  difficulty: string;
  vocabLevel?: number;
}

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

export function generateSectionInsight(section: Section): SectionInsight {
  const bench = SECTION_BENCHMARKS[section.name] ?? SECTION_BENCHMARKS['Diagnostic'];
  const accuracy = section.accuracy;
  const label = section.name === 'Reading and Writing' ? 'Reading & Writing' : section.name;
  const top10 = bench.top10.accuracy;
  const gap = top10 - accuracy;

  // Tier 1: Elite — at or above top 10%
  if (accuracy >= top10) {
    return {
      headline: `${label}: Elite-Tier Performance`,
      body: `At ${pct(accuracy)}, the student is performing at or above the estimated top 10% threshold (${pct(top10)}). This is a clear strength area — maintaining consistency and reinforcing time management under pressure will be the key differentiator on test day.`,
      tone: 'strength',
    };
  }

  // Tier 2: Strong — within 10 pts of top 10%
  if (gap <= 0.10) {
    return {
      headline: `${label}: Strong Performance — Top-Tier Within Reach`,
      body: `At ${pct(accuracy)}, the student is just ${Math.round(gap * 100)} points below the top-10% mark (${pct(top10)}). Targeted work on the two weakest domains in this section could push performance into elite territory before test day.`,
      tone: 'strength',
    };
  }

  // Tier 3: Developing — within 25 pts of top 10%
  if (gap <= 0.25) {
    return {
      headline: `${label}: Developing — Focused Preparation Needed`,
      body: `At ${pct(accuracy)}, the student has a ${Math.round(gap * 100)}-point gap to the top-10% threshold (${pct(top10)}). Structured domain-specific drilling will close this gap efficiently over 6–8 weeks of consistent preparation.`,
      tone: 'opportunity',
    };
  }

  // Tier 4: Critical — more than 25 pts below top 10%
  return {
    headline: `${label}: Significant Gap — Structured Intervention Recommended`,
    body: `A ${pct(accuracy)} accuracy score in ${label} (${Math.round(gap * 100)} points below the top-10% mark of ${pct(top10)}) signals foundational gaps requiring structured intervention. A focused 8–12 week curriculum targeting core concepts is recommended before moving to test-taking strategies.`,
    tone: 'critical',
  };
}

export function generateWeakDomainInsights(sections: Section[]): DomainInsight[] {
  const allDomains = sections.flatMap((s) => s.domainBreakdown);
  return allDomains
    .map((d) => {
      const bench = DOMAIN_BENCHMARKS[d.domain];
      const delta = bench ? d.accuracy - bench.top10 : 0;
      let note = '';
      if (d.accuracy < 0.40) {
        note = 'Critical gap — prioritize in first two weeks of preparation.';
      } else if (d.accuracy < 0.55) {
        note = 'Below average — requires targeted drill sets and concept review.';
      } else if (bench && d.accuracy < bench.top10) {
        note = 'Gap to top 10% — a focused session can yield meaningful improvement.';
      } else {
        note = 'At or near top-10% level — maintain with periodic review.';
      }
      return { domain: d.domain, delta, note };
    })
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3);
}

export function generateBehavioralInsight(questionDetails: QuestionDetail[]): string {
  const answered = questionDetails.filter((q) => q.answered && q.timeSeconds > 0);
  if (answered.length === 0) return 'No behavioral data recorded for this test session.';

  const avgTime = answered.reduce((a, q) => a + q.timeSeconds, 0) / answered.length;
  const confAnswered = answered.filter((q) => q.confidence > 0);
  const avgConf = confAnswered.length > 0
    ? confAnswered.reduce((a, q) => a + q.confidence, 0) / confAnswered.length
    : 0;

  const slowAndWrong = answered.filter((q) => q.timeSeconds > avgTime && !q.isCorrect).length;
  const lowConfCorrect = confAnswered.filter((q) => q.confidence <= 2 && q.isCorrect).length;
  const flaggedCount = answered.filter((q) => q.flagged).length;

  const parts: string[] = [];

  if (avgTime > 90) {
    parts.push('Pacing is slower than the SAT time budget — the student is spending an average of ' + Math.round(avgTime) + 's per question, which may create time pressure in later sections.');
  } else if (avgTime < 45) {
    parts.push('The student moves quickly through questions (' + Math.round(avgTime) + 's average), which is efficient but may indicate rushing on complex problems.');
  } else {
    parts.push('Question pacing (' + Math.round(avgTime) + 's average) is within the typical SAT range.');
  }

  if (avgConf > 0) {
    if (avgConf < 2.5) {
      parts.push('Average confidence (' + avgConf.toFixed(1) + '/5) is low — this may reflect genuine uncertainty or under-confidence that testing strategy work can address.');
    } else if (avgConf > 4.0) {
      parts.push('High self-reported confidence (' + avgConf.toFixed(1) + '/5) is notable, especially when paired with accuracy results.');
    }
  }

  if (lowConfCorrect > 3) {
    parts.push(`${lowConfCorrect} questions were answered correctly despite low confidence — a pattern suggesting the student's intuition is more reliable than they believe. Building trust in their process could unlock further gains.`);
  }

  if (slowAndWrong > Math.floor(answered.length * 0.2)) {
    parts.push('A notable cluster of slow-and-incorrect responses suggests time is being spent unproductively on difficult questions. Practicing strategic skipping will help.');
  }

  if (flaggedCount > 5) {
    parts.push(`${flaggedCount} flagged questions indicate uncertainty — reviewing these specific items would be high-value for the next study session.`);
  }

  return parts.join(' ');
}

export function generateVocabInsight(savedWords: SavedWord[]): string | null {
  if (savedWords.length === 0) return null;

  const levels = savedWords.map((w) => w.vocabLevel ?? difficultyToLevel(w.difficulty));
  const medianLevel = getMedianLevel(levels);
  const levelDef = getLevelDef(medianLevel);

  const highLevelWords = savedWords.filter((w) => (w.vocabLevel ?? difficultyToLevel(w.difficulty)) >= 8);
  const coreWords = savedWords.filter((w) => {
    const lv = w.vocabLevel ?? difficultyToLevel(w.difficulty);
    return lv === 6 || lv === 7;
  });

  // Distribution note
  let distribution = '';
  if (highLevelWords.length > 0 && coreWords.length > 0) {
    distribution = ` Of these, ${highLevelWords.length} are at Level 8+ (advanced academic) and ${coreWords.length} at Level 6–7 (SAT core academic).`;
  } else if (highLevelWords.length > 0) {
    distribution = ` Of these, ${highLevelWords.length} are at Level 8+ — advanced academic vocabulary rarely encountered outside scholarly texts.`;
  } else if (coreWords.length > 0) {
    distribution = ` Most of these (${coreWords.length}) fall within Level 6–7, the core academic vocabulary range targeted by SAT Reading.`;
  }

  return (
    `${savedWords.length} unfamiliar word${savedWords.length > 1 ? 's' : ''} flagged during this test.${distribution} ` +
    `The vocabulary gap is concentrated around Level ${medianLevel} — ${levelDef.description}. ` +
    `Representative words at this level include: ${levelDef.examples.slice(0, 3).join(', ')}.`
  );
}

export function generateExecutiveSummary(sections: Section[]): string {
  const totalCorrect = sections.reduce((a, s) => a + s.correctCount, 0);
  const totalQuestions = sections.reduce((a, s) => a + s.totalQuestions, 0);
  const overallAccuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

  const top10Bench = SECTION_BENCHMARKS['Diagnostic']?.top10.accuracy ?? 0.80;

  const strongSections = sections.filter((s) => {
    const b = SECTION_BENCHMARKS[s.name] ?? SECTION_BENCHMARKS['Diagnostic'];
    return s.accuracy >= b.top10.accuracy - 0.10;
  });

  const weakSections = sections.filter((s) => {
    const b = SECTION_BENCHMARKS[s.name] ?? SECTION_BENCHMARKS['Diagnostic'];
    return s.accuracy < b.top10.accuracy - 0.25;
  });

  if (overallAccuracy >= top10Bench) {
    return `Elite-tier performance at ${pct(overallAccuracy)} overall accuracy — the student is performing at or above the top-10% threshold${strongSections.length === sections.length ? ' across all sections' : ` with particular strength in ${strongSections.map((s) => s.name === 'Reading and Writing' ? 'R&W' : s.name).join(' and ')}`}. Consistency and test-day strategy will be the final differentiator.`;
  }

  if (overallAccuracy >= top10Bench - 0.10) {
    const focus = weakSections.length > 0 ? weakSections.map((s) => s.name === 'Reading and Writing' ? 'R&W' : s.name).join(' and ') : 'specific domains';
    return `Strong performance at ${pct(overallAccuracy)} overall — the student is within reach of the top-10% threshold (${pct(top10Bench)}). Targeted work in ${focus} could make the difference before test day.`;
  }

  if (overallAccuracy >= top10Bench - 0.25) {
    return `Developing performance at ${pct(overallAccuracy)} overall. The student has a solid foundation with a ${Math.round((top10Bench - overallAccuracy) * 100)}-point gap to the top-10% mark. With structured preparation across identified weak domains, reaching top-quartile performance is an achievable goal.`;
  }

  return `The diagnostic reveals significant foundational gaps at ${pct(overallAccuracy)} overall accuracy. This result provides a clear roadmap: with consistent, structured preparation targeting the identified weak domains, substantial score improvement is achievable. Early and focused intervention will be most effective.`;
}

export function generateKeyRecommendations(sections: Section[], savedWords: SavedWord[]): string[] {
  const recs: string[] = [];

  const weakDomains = generateWeakDomainInsights(sections);
  const criticalDomains = weakDomains.filter((d) => d.delta < -0.20);
  const opportunityDomains = weakDomains.filter((d) => d.delta >= -0.20 && d.delta < 0);

  if (criticalDomains.length > 0) {
    recs.push(`Priority focus: ${criticalDomains.map((d) => d.domain).join(', ')} — these domains have the largest gap to top-10% performance and should anchor the first 4 weeks of preparation.`);
  }

  if (opportunityDomains.length > 0) {
    recs.push(`Quick-win domains: ${opportunityDomains.map((d) => d.domain).join(', ')} — close to top-10% level with high potential for rapid improvement with targeted practice.`);
  }

  const mathSection = sections.find((s) => s.name === 'Math');
  const rwSection = sections.find((s) => s.name === 'Reading and Writing');

  if (mathSection && mathSection.accuracy < 0.55) {
    recs.push('Math foundations: Prioritize Algebra and Problem-Solving concepts before moving to Advanced Math. A strong algebraic base unlocks multiple domains.');
  }

  if (rwSection && rwSection.accuracy < 0.55) {
    recs.push('Reading fluency: Daily reading of complex non-fiction (science articles, essays) alongside SAT-style passage practice will improve both pace and comprehension.');
  }

  const hardWords = savedWords.filter((w) => w.difficulty === 'Hard').length;
  if (hardWords >= 3) {
    recs.push(`Vocabulary: ${hardWords} hard-level words flagged — build a personal SAT word bank starting with these, adding 10 new words per week.`);
  }

  recs.push('Timed practice: Complete at least two full-length timed practice tests before the exam to build stamina and calibrate pacing.');

  return recs.slice(0, 4);
}

export function generateAllInsights(
  sections: Section[],
  questionDetails: QuestionDetail[],
  savedWords: SavedWord[],
): ReportInsights {
  const sectionInsights: Record<string, SectionInsight> = {};
  for (const section of sections) {
    sectionInsights[section.name] = generateSectionInsight(section);
  }

  return {
    executiveSummary: generateExecutiveSummary(sections),
    sections: sectionInsights,
    topWeakDomains: generateWeakDomainInsights(sections),
    behavioral: generateBehavioralInsight(questionDetails),
    vocabulary: generateVocabInsight(savedWords),
    keyRecommendations: generateKeyRecommendations(sections, savedWords),
  };
}
