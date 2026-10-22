import { supabaseAdmin } from '@/lib/supabase-admin';
import diagnosticTest1, { type TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';
import diagnosticTest2 from '@/app/diagnosis/data/diagnostic-test-2';

const HARDCODED: Record<string, TestQuestion[]> = {
  'diagnostic-test-1': diagnosticTest1.questions,
  'diagnostic-test-2': diagnosticTest2.questions,
};

/** DB에 세트가 없거나 RW 문항이 없을 때 쓰는 하드코딩 문항. */
export function fallbackQuestions(testId: string): TestQuestion[] {
  return HARDCODED[testId] ?? diagnosticTest1.questions;
}

/**
 * 제출 세트의 문항(정답 포함)을 서버에서 가져온다. 학생에게 내려준 것과 같은 규칙으로 고른다:
 * DB 세트에 RW 문항이 없으면 하드코딩 전체 세트로 폴백(test-content 라우트와 동일).
 */
export async function resolveSetQuestions(
  versionId: string | null | undefined,
  testId: string
): Promise<TestQuestion[]> {
  const fallback = fallbackQuestions(testId);
  if (!versionId) return fallback;

  const { data } = await supabaseAdmin
    .from('diagnostic_test_versions')
    .select('questions')
    .eq('id', versionId)
    .single();

  const questions = (data?.questions ?? []) as TestQuestion[];
  const hasRW = questions.some((q) => q.section === 'Reading and Writing');
  return hasRW ? questions : fallback;
}
