// @vitest-environment node
/// <reference types="vitest/globals" />
import { GET } from '../route';
import { NextRequest } from 'next/server';

const tables: Record<string, unknown[]> = {};
let authed = true;

vi.mock('@/lib/server-auth', () => ({ isAuthenticated: () => authed }));
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const result = { data: tables[table] ?? [], error: null };
      const chain: Record<string, unknown> = { then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res) };
      chain.select = () => chain;
      chain.limit = () => chain;
      return chain;
    },
  },
}));

const mc = (id: string, section: string, correct: string) => ({
  id,
  type: 'multiple-choice',
  section,
  domain: section === 'Math' ? 'Algebra' : 'Craft and Structure',
  skill: 's',
  difficulty: 'Easy',
  question: 'q',
  options: ['A', 'B'].map((o) => ({ id: o, text: o, type: o === correct ? 'correct' : 'distractor' })),
});

const req = (qs = '') => new NextRequest(`http://localhost/api/admin/diagnosis/question-stats${qs}`);

describe('GET /api/admin/diagnosis/question-stats', () => {
  beforeEach(() => {
    authed = true;
    tables.diagnostic_test_versions = [
      { id: 'set-2', set_number: 2, is_current: true, test_id: 'diagnostic-test-2', questions: [mc('r1', 'Reading and Writing', 'A'), mc('m1', 'Math', 'B')] },
      { id: 'set-3', set_number: 3, is_current: false, test_id: null, questions: [mc('m1', 'Math', 'B')] },
    ];
    tables.diagnostic_test_results = [
      {
        test_id: 'diagnostic-test-2',
        test_version_id: 'set-2',
        answers: { __v2__: true, vocab: [], rw: [{ questionId: 'r1', finalAnswer: 'A', confidence: 70 }], math: { m1: 'B' } },
        confidence_levels: { m1: 50 },
        question_times: { r1: 20, m1: 40 },
      },
      {
        test_id: 'diagnostic-test-2',
        test_version_id: 'set-3',
        answers: { __v2__: true, vocab: [], rw: [], math: { m1: 'A' } },
        confidence_levels: {},
        question_times: { m1: 60 },
      },
      {
        test_id: 'diagnostic-test-1',
        test_version_id: 'set-3',
        answers: { m1: 'B' },
        confidence_levels: {},
        question_times: { m1: 10 },
      },
    ];
  });

  it('REQ-005: rejects unauthenticated calls', async () => {
    authed = false;
    expect((await GET(req())).status).toBe(401);
  });

  it('REQ-005: counts v2 nested answers and pools the shared question across sets of one format', async () => {
    const res = await GET(req('?testId=diagnostic-test-2&versionId=set-3'));
    const body = await res.json();
    expect(body.totalResults).toBe(1);
    expect(body.pooledResults).toBe(2);
    const m1 = body.stats.find((s: { questionId: string }) => s.questionId === 'm1');
    // set-2 and set-3 results of format 2 are pooled; the format-1 result is not
    expect(m1.exposures).toBe(2);
    expect(m1.correctCount).toBe(1);
    expect(m1.accuracyRate).toBe(0.5);
  });

  it('REQ-005: with only versionId, the format follows the set instead of defaulting to format 1', async () => {
    const body = await (await GET(req('?versionId=set-2'))).json();
    expect(body.testId).toBe('diagnostic-test-2');
    expect(body.totalResults).toBe(1);
  });

  it('REQ-005: the current set is picked per format', async () => {
    tables.diagnostic_test_versions.push({
      id: 'set-1', set_number: 1, is_current: true, test_id: 'diagnostic-test-1', questions: [mc('m1', 'Math', 'B')],
    });
    const f1 = await (await GET(req('?testId=diagnostic-test-1'))).json();
    const f2 = await (await GET(req('?testId=diagnostic-test-2'))).json();
    expect(f1.versionId).toBe('set-1');
    expect(f2.versionId).toBe('set-2');
  });

  it('REQ-005: defaults to the current set and returns 404 for an unknown set', async () => {
    const body = await (await GET(req('?testId=diagnostic-test-2'))).json();
    expect(body.versionId).toBe('set-2');
    expect(body.stats.map((s: { questionId: string }) => s.questionId)).toEqual(['r1', 'm1']);
    expect((await GET(req('?versionId=nope'))).status).toBe(404);
  });
});
