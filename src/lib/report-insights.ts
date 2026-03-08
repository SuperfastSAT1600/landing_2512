/**
 * Rule-based insight engine for the SAT diagnostic report.
 * Pure functions — no AI, no side effects.
 */

import { SECTION_BENCHMARKS, DOMAIN_BENCHMARKS } from './report-benchmarks';

export interface SectionInsight {
  headline: string;
  body: string;
  tone: 'strength' | 'opportunity' | 'critical';
}

export interface DomainInsight {
  domain: string;
  delta: number; // vs global average
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
}

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function delta(a: number, b: number): string {
  const d = Math.round((a - b) * 100);
  return d >= 0 ? `+${d} pts` : `${d} pts`;
}

export function generateSectionInsight(section: Section): SectionInsight {
  const bench = SECTION_BENCHMARKS[section.name];
  const accuracy = section.accuracy;
  const label = section.name === 'Reading and Writing' ? 'Reading & Writing' : section.name;

  if (!bench) {
    return {
      headline: `${label}: ${pct(accuracy)} accuracy`,
      body: `The student answered ${section.correctCount} out of ${section.totalQuestions} questions correctly.`,
      tone: accuracy >= 0.6 ? 'strength' : 'opportunity',
    };
  }

  const vsAvg = accuracy - bench.globalAverage.accuracy;
  const vsTop = accuracy - bench.top10.accuracy;

  if (accuracy >= bench.top10.accuracy) {
    return {
      headline: `${label}: Elite-Tier Performance`,
      body: `At ${pct(accuracy)}, the student ranks among the estimated top 10% of SAT test-takers in ${label}. This is a clear strength area — maintaining consistency and reinforcing time management under pressure will be key before test day.`,
      tone: 'strength',
    };
  }

  if (vsAvg >= 0.08) {
    return {
      headline: `${label}: Solid Above-Average`,
      body: `The student scored ${pct(accuracy)} — ${delta(accuracy, bench.globalAverage.accuracy)} above the estimated average. Targeted work on the two weakest domains in this section could push performance closer to top-10% territory (${pct(bench.top10.accuracy)}).`,
      tone: 'strength',
    };
  }

  if (vsAvg >= 0) {
    return {
      headline: `${label}: Slightly Above Average, Room to Grow`,
      body: `At ${pct(accuracy)}, the student is tracking just above the estimated global average (${pct(bench.globalAverage.accuracy)}). A gap of ${delta(bench.top10.accuracy, accuracy).replace('+', '')} separates them from the top 10%. Structured domain-specific drilling will close this gap efficiently.`,
      tone: 'opportunity',
    };
  }

  if (vsAvg >= -0.10) {
    return {
      headline: `${label}: Below Average — Priority Focus Area`,
      body: `At ${pct(accuracy)}, the student trails the estimated average by ${Math.round(Math.abs(vsAvg) * 100)} points. This section should be a primary focus area. Foundational concept work combined with timed practice sets is recommended before moving to test-taking strategies.`,
      tone: 'opportunity',
    };
  }

  return {
    headline: `${label}: Significant Skill Gap Detected`,
    body: `A ${pct(accuracy)} accuracy score in ${label} signals foundational gaps requiring structured intervention. ${vsTop < -0.30 ? 'The gap to top performance is substantial — a focused 8–12 week curriculum is recommended.' : 'Consistent daily practice on core concepts will be essential.'}`,
    tone: 'critical',
  };
}

export function generateWeakDomainInsights(sections: Section[]): DomainInsight[] {
  const allDomains = sections.flatMap((s) => s.domainBreakdown);
  return allDomains
    .map((d) => {
      const bench = DOMAIN_BENCHMARKS[d.domain];
      const delta = bench ? d.accuracy - bench.globalAverage : 0;
      let note = '';
      if (d.accuracy < 0.40) {
        note = 'Critical gap — prioritize in first two weeks of preparation.';
      } else if (d.accuracy < 0.55) {
        note = 'Below average — requires targeted drill sets and concept review.';
      } else if (d.accuracy < bench?.globalAverage) {
        note = 'Slightly below average — a focused session can yield quick improvement.';
      } else {
        note = 'Near or above average — maintain with periodic review.';
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
  const fastAndRight = answered.filter((q) => q.timeSeconds <= avgTime && q.isCorrect).length;
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

  const hard = savedWords.filter((w) => w.difficulty === 'Hard').length;
  const medium = savedWords.filter((w) => w.difficulty === 'Medium').length;

  if (hard >= 5) {
    return `${savedWords.length} unfamiliar words were flagged, with ${hard} appearing in Hard-difficulty questions. This vocabulary gap is likely suppressing the R&W score. A targeted SAT word list focused on rhetorical and analytical vocabulary is strongly recommended.`;
  }

  if (savedWords.length >= 10) {
    return `${savedWords.length} words were marked as unfamiliar. With ${medium} from Medium-difficulty questions, vocabulary work should be integrated into the weekly study plan — even 15 minutes of daily word study compounds significantly over 8 weeks.`;
  }

  return `${savedWords.length} unfamiliar words flagged — a manageable vocabulary gap. Reviewing these specific words and their contextual usage in SAT passages will yield a quick accuracy boost.`;
}

export function generateExecutiveSummary(sections: Section[]): string {
  const totalCorrect = sections.reduce((a, s) => a + s.correctCount, 0);
  const totalQuestions = sections.reduce((a, s) => a + s.totalQuestions, 0);
  const overallAccuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

  const strongSections = sections.filter((s) => {
    const b = SECTION_BENCHMARKS[s.name];
    return b ? s.accuracy >= b.globalAverage.accuracy : s.accuracy >= 0.6;
  });

  const weakSections = sections.filter((s) => {
    const b = SECTION_BENCHMARKS[s.name];
    return b ? s.accuracy < b.globalAverage.accuracy : s.accuracy < 0.5;
  });

  if (overallAccuracy >= 0.80) {
    return `Strong overall performance at ${pct(overallAccuracy)} accuracy across all sections. The student demonstrates solid SAT readiness${strongSections.length === sections.length ? ' across both sections' : ` with particular strength in ${strongSections.map((s) => s.name === 'Reading and Writing' ? 'R&W' : s.name).join(' and ')}`}. A focused review of weaker domains and test-day strategy will be the key differentiator.`;
  }

  if (overallAccuracy >= 0.60) {
    const focus = weakSections.length > 0 ? weakSections.map((s) => s.name === 'Reading and Writing' ? 'R&W' : s.name).join(' and ') : 'specific domains';
    return `Above-average performance at ${pct(overallAccuracy)} overall. The student has a solid foundation with meaningful upside in ${focus}. With targeted preparation, a top-quartile score is an achievable goal.`;
  }

  if (overallAccuracy >= 0.45) {
    return `Moderate performance at ${pct(overallAccuracy)} overall. The diagnostic reveals clear skill gaps that, with structured preparation, are highly addressable. Both sections offer significant room for score improvement — a prioritized study plan focused on foundational concepts is the recommended starting point.`;
  }

  return `The diagnostic reveals significant foundational gaps at ${pct(overallAccuracy)} overall accuracy. This result provides a clear roadmap: with consistent, structured preparation targeting the identified weak domains, substantial score improvement is achievable. Early and focused intervention will be most effective.`;
}

export function generateKeyRecommendations(sections: Section[], savedWords: SavedWord[]): string[] {
  const recs: string[] = [];

  const weakDomains = generateWeakDomainInsights(sections);
  const criticalDomains = weakDomains.filter((d) => d.delta < -0.10);
  const opportunityDomains = weakDomains.filter((d) => d.delta >= -0.10 && d.delta < 0);

  if (criticalDomains.length > 0) {
    recs.push(`Priority focus: ${criticalDomains.map((d) => d.domain).join(', ')} — these domains are significantly below average and should anchor the first 4 weeks of preparation.`);
  }

  if (opportunityDomains.length > 0) {
    recs.push(`Quick-win domains: ${opportunityDomains.map((d) => d.domain).join(', ')} — slightly below average with high potential for rapid improvement with targeted practice.`);
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
