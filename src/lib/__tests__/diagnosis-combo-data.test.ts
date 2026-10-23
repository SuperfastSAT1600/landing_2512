// @vitest-environment node
/// <reference types="vitest/globals" />
import { loadComboContext, loadFormatResults, getComboBenchmarks, clearComboBenchmarkCache } from '../diagnosis-combo-data';

const tables: Record<string, unknown[]> = {};

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

const question = (id: string) => ({
  id,
  type: 'multiple-choice',
  section: 'Math',
  domain: 'Algebra',
  skill: 's',
  difficulty: 'Easy',
  question: 'q',
  options: [{ id: 'A', text: 'a', type: 'correct' }, { id: 'B', text: 'b', type: 'distractor' }],
});

describe('diagnosis-combo-data', () => {
  beforeEach(() => {
    clearComboBenchmarkCache();
    tables.diagnostic_test_versions = [
      { id: 'set-2', set_number: 2, questions: [question('q1'), question('q2')] },
    ];
    tables.diagnostic_test_results = [
      { test_id: 'mgui9bty2zokyowawbl', test_version_id: null, answers: {}, confidence_levels: {}, question_times: {} },
      { test_id: 'diagnostic-test-2', test_version_id: 'set-2', answers: {}, confidence_levels: {}, question_times: {} },
      { test_id: null, test_version_id: null, answers: {}, confidence_levels: {}, question_times: {} },
    ];
  });

  it('REQ-001: pool contains replaced questions from every set', async () => {
    const ctx = await loadComboContext();
    expect(ctx.pool.has('q1')).toBe(true);
    expect(ctx.sets.get('set-2')?.setNumber).toBe(2);
  });

  it('REQ-002: groups legacy and null format ids with diagnostic-test-1', async () => {
    expect(await loadFormatResults('diagnostic-test-1')).toHaveLength(2);
    expect(await loadFormatResults('diagnostic-test-2')).toHaveLength(1);
  });

  it('REQ-003: a small combo gets no borrowed benchmark', async () => {
    const b = await getComboBenchmarks('diagnostic-test-2', 'set-2');
    expect(b.source).toBe('insufficient');
    expect(b.sections).toEqual({});
  });
});
