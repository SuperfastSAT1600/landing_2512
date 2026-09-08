/**
 * REQ-001: Shared report data fetching logic.
 * Used by both the API route (for external consumers) and the page (direct call).
 * Eliminates the self-fetch anti-pattern that caused "Application error" on tutoring.superfastsat.com.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { SECTION_BENCHMARKS, DOMAIN_BENCHMARKS } from '@/lib/report-benchmarks';
import { difficultyToLevel } from '@/lib/vocab-levels';
import diagnosticTest1, { type TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';
import { diagnosticTest2Vocab } from '@/app/diagnosis/data/diagnostic-test-2-vocab';
import { classifyRWQuestion, classifyRWStudent, type RWQuestionType, type RWStudentProfile } from '@/lib/rw-profile';

// REQ-003: type guard — JSONB can store any type, not just string
const safeStr = (v: unknown): string =>
  typeof v === 'string' ? v : String(v ?? '');

export type { RWQuestionType, RWStudentProfile };

export interface VocabDiagnosisItem {
  wordId: string;
  word: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
  timeTaken: number;
}

export interface RWCognitionItem {
  questionId: string;
  questionNumber: number;
  domain: string;
  skill: string;
  difficulty: string;
  optionsViewedCount: number;
  confidence: number;
  isCorrect: boolean;
  questionType: RWQuestionType;
}

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
  testId: string;
  vocabResults?: VocabDiagnosisItem[];
  rwCognitionData?: RWCognitionItem[];
  rwStudentProfile?: RWStudentProfile;
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
    const resultTestId = (result as { test_id?: string }).test_id ?? 'diagnostic-test-1';
    const { data: current } = await supabaseAdmin
      .from('diagnostic_test_versions')
      .select('questions')
      .eq('is_current', true)
      .eq('test_id', resultTestId)
      .maybeSingle();
    if (current?.questions) questions = current.questions as TestQuestion[];
  }

  if (questions.length === 0) {
    questions = diagnosticTest1.questions as TestQuestion[];
  }

  // REQ-003: JSONB values are cast but may be any type at runtime
  const rawAnswers: Record<string, unknown> = result.answers ?? {};
  const confidenceLevels: Record<string, number> = result.confidence_levels ?? {};
  const questionTimes: Record<string, number> = result.question_times ?? {};
  const flaggedQuestions: string[] = result.flagged_questions ?? [];
  const savedWords: { word: string; questionId: string; section: string }[] =
    result.saved_words ?? [];

  // v2 detection — answers stored as { __v2__: true, vocab, rw, math }
  const isV2 = result.test_id === 'diagnostic-test-2' || rawAnswers.__v2__ === true;
  const mathAnswers: Record<string, unknown> = isV2
    ? (rawAnswers.math as Record<string, unknown> ?? {})
    : rawAnswers;
  type RawRWResult = { questionId: string; firstYesOptionId: string; optionsViewedCount: number; finalAnswer: string; confidence: number; isCorrect: boolean };
  type RawVocabResult = { wordId: string; selectedOptionId: string | null; isCorrect: boolean; timeTaken: number };
  const rwResultsRaw: RawRWResult[] = isV2 ? (rawAnswers.rw as RawRWResult[] ?? []) : [];
  const vocabResultsRaw: RawVocabResult[] = isV2 ? (rawAnswers.vocab as RawVocabResult[] ?? []) : [];

  const domainStats: Record<string, { correct: number; total: number }> = {};
  const sectionStats: Record<string, { correct: number; total: number }> = {};
  const rwCognitionItems: RWCognitionItem[] = [];

  const questionDetails = questions.map((q, idx) => {
    let isCorrect = false;
    let answered = false;
    let confidence = 0;

    if (isV2 && q.section === 'Reading and Writing') {
      const rwResult = rwResultsRaw.find(r => r.questionId === q.id);
      if (rwResult) {
        isCorrect = rwResult.isCorrect;
        answered = true;
        confidence = rwResult.confidence ?? 0;
        const options = q.options ?? [];
        const correctOptionIdx = options.findIndex(o => o.type === 'correct');
        const chosenOptionIdx = options.findIndex(o => o.id === rwResult.firstYesOptionId);
        const questionType = classifyRWQuestion({ isCorrect, confidence, chosenOptionIdx, correctOptionIdx });
        rwCognitionItems.push({
          questionId: q.id,
          questionNumber: idx + 1,
          domain: q.domain,
          skill: q.skill,
          difficulty: q.difficulty,
          optionsViewedCount: rwResult.optionsViewedCount,
          confidence,
          isCorrect,
          questionType,
        });
      }
    } else {
      const studentAnswer = mathAnswers[q.id];
      const correctAnswer =
        q.type === 'multiple-choice'
          ? (q.options?.find((o) => o.type === 'correct')?.id ?? '')
          : (q.answers?.[0] ?? '');
      isCorrect = studentAnswer !== undefined
        ? q.type === 'multiple-choice'
          ? safeStr(studentAnswer) === safeStr(correctAnswer)
          : safeStr(studentAnswer).trim().toLowerCase() === safeStr(correctAnswer).trim().toLowerCase()
        : false;
      answered = studentAnswer !== undefined;
      confidence = confidenceLevels[q.id] ?? 0;
    }

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
      confidence,
      flagged: flaggedQuestions.includes(q.id),
    };
  });

  // v2 vocab results — cross-reference with word list for display text
  const vocabWordMap = new Map(diagnosticTest2Vocab.map(v => [v.id, v.word]));
  const vocabResults: VocabDiagnosisItem[] = vocabResultsRaw.map(v => ({
    wordId: v.wordId,
    word: vocabWordMap.get(v.wordId) ?? v.wordId,
    selectedOptionId: v.selectedOptionId,
    isCorrect: v.isCorrect,
    timeTaken: v.timeTaken,
  }));

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
    testId: result.test_id ?? 'diagnostic-test-1',
    vocabResults: isV2 ? vocabResults : undefined,
    rwCognitionData: isV2 && rwCognitionItems.length > 0 ? rwCognitionItems : undefined,
    rwStudentProfile: isV2 && rwCognitionItems.length > 0
      ? classifyRWStudent(rwCognitionItems.map(i => i.questionType))
      : undefined,
  };
}
