// @vitest-environment node
/// <reference types="vitest/globals" />
import { fetchReportData } from '../report-data';
import { clearComboBenchmarkCache } from '../diagnosis-combo-data';

const tables: Record<string, Record<string, unknown>[]> = {};

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const rows = tables[table] ?? [];
      let filtered = rows;
      const chain: Record<string, unknown> = {
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: filtered, error: null }).then(res),
      };
      chain.select = () => chain;
      chain.limit = () => chain;
      chain.eq = (col: string, val: unknown) => {
        filtered = rows.filter((r) => r[col] === val);
        return chain;
      };
      chain.single = () => Promise.resolve({ data: filtered[0] ?? null, error: null });
      chain.maybeSingle = chain.single;
      return chain;
    },
  },
}));

const mc = (id: string, domain: string, correct: string) => ({
  id,
  type: 'multiple-choice',
  section: 'Math',
  domain,
  skill: 's',
  difficulty: 'Easy',
  question: 'q',
  options: ['A', 'B'].map((o) => ({ id: o, text: o, type: o === correct ? 'correct' : 'distractor' })),
});

const resultRow = (over: Record<string, unknown>) => ({
  id: 'res-1',
  student_name: 'S',
  submitted_at: '2026-10-01T00:00:00Z',
  total_time_seconds: 600,
  time_limit_minutes: 40,
  test_id: 'diagnostic-test-2',
  test_version_id: 'set-2',
  confidence_levels: {},
  flagged_questions: [],
  saved_words: [],
  ...over,
});

describe('fetchReportData', () => {
  beforeEach(() => {
    clearComboBenchmarkCache();
    tables.diagnostic_test_versions = [
      { id: 'set-1', set_number: 1, is_current: false, questions: [mc('old1', 'Algebra', 'A'), mc('old2', 'Algebra', 'A')] },
      { id: 'set-2', set_number: 2, is_current: true, questions: [mc('new1', 'Algebra', 'B'), mc('new2', 'Algebra', 'B')] },
    ];
  });

  it('REQ-004: grades answers to questions that were later replaced in the set', async () => {
    tables.diagnostic_test_results = [
      resultRow({
        answers: { __v2__: true, vocab: [], rw: [], math: { old1: 'A', old2: 'B' } },
        question_times: { old1: 30, old2: 30 },
      }),
    ];
    const data = await fetchReportData('res-1');
    expect(data!.sections[0]).toMatchObject({ name: 'Math', totalQuestions: 2, correctCount: 1 });
  });

  it('REQ-004: a v2 result never gets the format-1 static benchmark', async () => {
    tables.diagnostic_test_results = [
      resultRow({ answers: { __v2__: true, vocab: [], rw: [], math: { new1: 'B', new2: 'B' } }, question_times: {} }),
    ];
    const data = await fetchReportData('res-1');
    expect(data!.benchmarks.source).toBe('insufficient');
    expect(data!.benchmarks.sections).toEqual({});
  });

  it('REQ-004: format 1 + set 1 with a small sample falls back to the legacy benchmark', async () => {
    tables.diagnostic_test_results = [
      resultRow({
        test_id: 'diagnostic-test-1',
        test_version_id: 'set-1',
        answers: { old1: 'A', old2: 'A' },
        question_times: {},
      }),
    ];
    const data = await fetchReportData('res-1');
    expect(data!.benchmarks.source).toBe('legacy');
    expect(data!.benchmarks.sections['Math'].top10.accuracy).toBe(0.78);
  });
});
