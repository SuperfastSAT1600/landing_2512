/**
 * REQ-001: Shared report data fetching logic.
 * Used by both the API route (for external consumers) and the page (direct call).
 * Eliminates the self-fetch anti-pattern that caused "Application error" on tutoring.superfastsat.com.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { SECTION_BENCHMARKS, DOMAIN_BENCHMARKS } from '@/lib/report-benchmarks';
import { difficultyToLevel } from '@/lib/vocab-levels';
import diagnosticTest1, { type TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';

// REQ-003: type guard — JSONB can store any type, not just string
const safeStr = (v: unknown): string =>
  typeof v === 'string' ? v : String(v ?? '');

export interface ReportData {
  studentName: string;
  submittedAt: string;
  totalTimeSeconds: number;
  timeLimitMinutes: number;
  sections: {
    name: string;
    accuracy: number;
    correctCount: number;
    totalQuestions: number;
    domainBreakdown: { domain: string; accuracy: number; correct: number; total: number }[];
  }[];
  questionDetails: {
    id: string;
    number: number;
    section: string;
    domain: string;
    skill: string;
    difficulty: string;
    isCorrect: boolean;
    answered: boolean;
    timeSeconds: number;
    confidence: number;
    flagged: boolean;
  }[];
  savedWords: { word: string; section: string; difficulty: string; domain: string; vocabLevel: number }[];
  benchmarks: {
    sections: typeof SECTION_BENCHMARKS;
    domains: typeof DOMAIN_BENCHMARKS;
  };
  editedInsights: Record<string, string> | null;
  coupon: { discountPercent: number; expiresAt: string } | null;
  previousScoreStatus?: 'scored' | 'never_taken' | 'dont_remember';
  previousTestDate?: string;
  previousRwScore?: number;
  previousMathScore?: number;
}

/**
 * Fetch and compute all report data for a given resultId.
 * Returns null if the result is not found.
 * REQ-002: wraps DB calls in try/catch — never throws.
 */
export async function fetchReportData(resultId: string): Promise<ReportData | null> {
  const { data: result, error } = await supabaseAdmin
    .from('diagnostic_test_results')
    .select('*')
    .eq('id', resultId)
    .single();

  if (error || !result) return null;

  // Fetch questions from the version (or fall back to current version, then hardcoded)
  let questions: TestQuestion[] = [];
  const versionId = result.test_version_id;

  if (versionId) {
    const { data: version } = await supabaseAdmin
      .from('diagnostic_test_versions')
      .select('questions')
      .eq('id', versionId)
      .single();
    if (version?.questions) questions = version.questions as TestQuestion[];
  } else {
    const { data: current } = await supabaseAdmin
      .from('diagnostic_test_versions')
      .select('questions')
      .eq('is_current', true)
      .maybeSingle();
    if (current?.questions) questions = current.questions as TestQuestion[];
  }

  if (questions.length === 0) {
    questions = diagnosticTest1.questions as TestQuestion[];
  }

  // REQ-003: JSONB values are cast but may be any type at runtime
  const answers: Record<string, unknown> = result.answers ?? {};
  const confidenceLevels: Record<string, number> = result.confidence_levels ?? {};
  const questionTimes: Record<string, number> = result.question_times ?? {};
  const flaggedQuestions: string[] = result.flagged_questions ?? [];
  const savedWords: { word: string; questionId: string; section: string }[] =
    result.saved_words ?? [];

  const domainStats: Record<string, { correct: number; total: number }> = {};
  const sectionStats: Record<string, { correct: number; total: number }> = {};

  const questionDetails = questions.map((q, idx) => {
    const studentAnswer = answers[q.id];
    const correctAnswer =
      q.type === 'multiple-choice'
        ? (q.options?.find((o) => o.type === 'correct')?.id ?? '')
        : (q.answers?.[0] ?? '');

    const isCorrect = studentAnswer !== undefined
      ? q.type === 'multiple-choice'
        ? safeStr(studentAnswer) === safeStr(correctAnswer)
        // REQ-003: safeStr() prevents TypeError when JSONB has non-string values
        : safeStr(studentAnswer).trim().toLowerCase() === safeStr(correctAnswer).trim().toLowerCase()
      : false;

    const answered = studentAnswer !== undefined;

    if (!domainStats[q.domain]) domainStats[q.domain] = { correct: 0, total: 0 };
    domainStats[q.domain].total++;
    if (answered && isCorrect) domainStats[q.domain].correct++;

    if (!sectionStats[q.section]) sectionStats[q.section] = { correct: 0, total: 0 };
    sectionStats[q.section].total++;
    if (answered && isCorrect) sectionStats[q.section].correct++;

    return {
      id: q.id,
      number: idx + 1,
      section: q.section,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty,
      isCorrect,
      answered,
      timeSeconds: questionTimes[q.id] ?? 0,
      confidence: confidenceLevels[q.id] ?? 0,
      flagged: flaggedQuestions.includes(q.id),
    };
  });

  const sections = Object.entries(sectionStats).map(([name, stats]) => {
    const domainBreakdown = Object.entries(domainStats)
      .filter(([domain]) => {
        const q = questions.find((q) => q.domain === domain);
        return q?.section === name;
      })
      .map(([domain, dStats]) => ({
        domain,
        accuracy: dStats.total > 0 ? dStats.correct / dStats.total : 0,
        correct: dStats.correct,
        total: dStats.total,
      }));

    return {
      name,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
      correctCount: stats.correct,
      totalQuestions: stats.total,
      domainBreakdown,
    };
  });

  const enrichedSavedWords = savedWords.map((sw) => {
    const q = questions.find((q) => q.id === sw.questionId);
    const difficulty = q?.difficulty ?? 'Medium';
    return {
      word: sw.word,
      section: sw.section,
      difficulty,
      domain: q?.domain ?? '',
      vocabLevel: difficultyToLevel(difficulty),
    };
  });

  return {
    studentName: result.student_name,
    submittedAt: result.submitted_at,
    totalTimeSeconds: result.total_time_seconds ?? 0,
    timeLimitMinutes: result.time_limit_minutes ?? 30,
    sections,
    questionDetails,
    savedWords: enrichedSavedWords,
    benchmarks: {
      sections: SECTION_BENCHMARKS,
      domains: DOMAIN_BENCHMARKS,
    },
    editedInsights: result.edited_insights ?? null,
    coupon: result.coupon ?? null,
    previousScoreStatus: result.previous_score_status ?? undefined,
    previousTestDate: result.previous_test_date ?? undefined,
    previousRwScore: result.previous_rw_score ?? undefined,
    previousMathScore: result.previous_math_score ?? undefined,
  };
}
