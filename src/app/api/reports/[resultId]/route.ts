import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SECTION_BENCHMARKS, DOMAIN_BENCHMARKS } from '@/lib/report-benchmarks';
import { difficultyToLevel } from '@/lib/vocab-levels';
import type { TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';

/**
 * GET /api/reports/[resultId]
 * Public endpoint — no authentication required.
 * Returns sanitized report data (no PII beyond student name).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ resultId: string }> }
) {
  const { resultId } = await params;

  // Fetch the test result
  const { data: result, error } = await supabaseAdmin
    .from('diagnostic_test_results')
    .select('*')
    .eq('id', resultId)
    .single();

  if (error || !result) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Fetch questions from the version (or fall back to current version)
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
    // Legacy: load from current version
    const { data: current } = await supabaseAdmin
      .from('diagnostic_test_versions')
      .select('questions')
      .eq('is_current', true)
      .maybeSingle();
    if (current?.questions) questions = current.questions as TestQuestion[];
  }

  const answers: Record<string, string> = result.answers ?? {};
  const confidenceLevels: Record<string, number> = result.confidence_levels ?? {};
  const questionTimes: Record<string, number> = result.question_times ?? {};
  const flaggedQuestions: string[] = result.flagged_questions ?? [];
  const savedWords: { word: string; questionId: string; section: string }[] =
    result.saved_words ?? [];

  // Build per-question details and section/domain stats
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
        ? studentAnswer === correctAnswer
        : studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
      : false;

    const answered = studentAnswer !== undefined;

    // Accumulate domain stats (only answered questions)
    if (answered) {
      if (!domainStats[q.domain]) domainStats[q.domain] = { correct: 0, total: 0 };
      domainStats[q.domain].total++;
      if (isCorrect) domainStats[q.domain].correct++;

      if (!sectionStats[q.section]) sectionStats[q.section] = { correct: 0, total: 0 };
      sectionStats[q.section].total++;
      if (isCorrect) sectionStats[q.section].correct++;
    }

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

  // Build section summaries with domain breakdowns
  const sections = Object.entries(sectionStats).map(([name, stats]) => {
    const domainBreakdown = Object.entries(domainStats)
      .filter(([domain]) => {
        // Match domain to section via questions
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

  // Enrich saved words with difficulty from questions
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

  return NextResponse.json({
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
  });
}
