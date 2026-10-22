// @vitest-environment node
/// <reference types="vitest/globals" />
import { GET } from '../route';
import { NextRequest } from 'next/server';

const tables: Record<string, unknown[]> = {};

vi.mock('@/lib/server-auth', () => ({ isAuthenticated: () => true }));
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const rows = tables[table] ?? [];
      const result = { data: rows, error: null, count: rows.length };
      const chain: Record<string, unknown> = { then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res) };
      for (const m of ['select', 'order', 'range', 'or', 'gte', 'lt', 'limit']) chain[m] = () => chain;
      return chain;
    },
  },
}));

const mc = (id: string, correct: string) => ({
  id,
  type: 'multiple-choice',
  section: 'Math',
  domain: 'Algebra',
  skill: 's',
  difficulty: 'Easy',
  question: 'q',
  options: ['A', 'B'].map((o) => ({ id: o, text: o, type: o === correct ? 'correct' : 'distractor' })),
});

describe('GET /api/admin/diagnosis/results', () => {
  beforeEach(() => {
    tables.diagnostic_test_versions = [
      { id: 'set-1', set_number: 1, is_current: false, questions: [mc('old1', 'A'), mc('old2', 'A')] },
      { id: 'set-2', set_number: 2, is_current: true, questions: [mc('new1', 'B'), mc('new2', 'B')] },
    ];
    tables.diagnostic_test_results = [
      {
        id: 'r-new',
        student_name: 'A',
        test_id: 'diagnostic-test-2',
        test_version_id: 'set-2',
        submitted_at: '2026-10-01T00:00:00Z',
        total_time_seconds: 100,
        answers: { __v2__: true, vocab: [{ wordId: 'v1', isCorrect: true }], rw: [], math: { new1: 'B', new2: 'A' } },
        confidence_levels: {},
        question_times: { new1: 10, new2: 10 },
      },
      {
        // 세트 2에서 문항이 교체되기 전에 제출된 결과 — 예전 ID로 답했다
        id: 'r-stale',
        student_name: 'B',
        test_id: 'diagnostic-test-2',
        test_version_id: 'set-2',
        submitted_at: '2026-09-20T00:00:00Z',
        total_time_seconds: 100,
        answers: { __v2__: true, vocab: [], rw: [], math: { old1: 'A', old2: 'B' } },
        confidence_levels: {},
        question_times: { old1: 10, old2: 10 },
      },
    ];
  });

  it('REQ-005: grades each result against its own set and recovers replaced questions', async () => {
    const res = await GET(new NextRequest('http://localhost/api/admin/diagnosis/results'));
    const { results } = await res.json();
    const byId = Object.fromEntries(results.map((r: { id: string }) => [r.id, r]));
    expect(byId['r-new']).toMatchObject({ answeredCount: 2, totalQuestions: 2, correctCount: 1, vocabCorrectCount: 1 });
    expect(byId['r-stale']).toMatchObject({ answeredCount: 2, totalQuestions: 2, correctCount: 1 });
  });
});
