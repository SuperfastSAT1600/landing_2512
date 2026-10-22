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

const mathQ = {
  id: 'm1',
  type: 'multiple-choice',
  section: 'Math',
  domain: 'Algebra',
  skill: 's',
  difficulty: 'Easy',
  question: 'q',
  options: [{ id: 'A', text: 'a', type: 'correct' }, { id: 'B', text: 'b', type: 'distractor' }],
};

describe('GET /api/admin/diagnosis/combo-stats', () => {
  beforeEach(() => {
    authed = true;
    tables.diagnostic_test_versions = [
      { id: 'set-1', set_number: 1, is_current: true, questions: [mathQ] },
      { id: 'set-2', set_number: 2, is_current: false, questions: [mathQ] },
    ];
    tables.diagnostic_test_results = [
      { test_id: 'diagnostic-test-1', test_version_id: 'set-1', answers: { m1: 'A' }, confidence_levels: {}, question_times: { m1: 30 } },
      { test_id: 'diagnostic-test-2', test_version_id: 'set-2', answers: { __v2__: true, vocab: [], rw: [], math: { m1: 'B' } }, confidence_levels: {}, question_times: { m1: 30 } },
    ];
  });

  it('REQ-005: rejects unauthenticated calls', async () => {
    authed = false;
    expect((await GET(new NextRequest('http://localhost/x'))).status).toBe(401);
  });

  it('REQ-005: evaluates each (format, set) combination separately', async () => {
    const { combos } = await (await GET(new NextRequest('http://localhost/x'))).json();
    expect(combos).toHaveLength(2);
    const f1 = combos.find((c: { format: string }) => c.format === 'diagnostic-test-1');
    const f2 = combos.find((c: { format: string }) => c.format === 'diagnostic-test-2');
    expect(f1).toMatchObject({ setNumber: 1, sampleSize: 1 });
    expect(f1.sections.Math.accuracy).toBe(1);
    expect(f2).toMatchObject({ setNumber: 2, sampleSize: 1 });
    expect(f2.sections.Math.accuracy).toBe(0);
  });
});
