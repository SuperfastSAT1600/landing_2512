// @vitest-environment node
/// <reference types="vitest/globals" />
import { POST } from '../submit/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock('@/lib/slack', () => ({
  notifyTestSubmission: vi.fn().mockResolvedValue(undefined),
}));

import { supabaseAdmin } from '@/lib/supabase-admin';

const mockFrom = (supabaseAdmin as unknown as { from: ReturnType<typeof vi.fn> }).from;

// Fluent Supabase chain mock — returns chainable object ending in the given result
function makeChain(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const terminal = vi.fn().mockResolvedValue(result);
  const self = () => chain;

  ['select', 'eq', 'neq', 'gte', 'lte', 'limit', 'is', 'order', 'update'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain['single'] = terminal;
  chain['maybeSingle'] = terminal;
  chain['insert'] = vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue(result),
  });
  void self;
  return chain;
}

describe('POST /api/diagnosis/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject request with missing required fields', async () => {
    const req = { json: async () => ({ studentEmail: 'test@example.com' }) } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should include savedWords in the submission payload', async () => {
    // Call order with tokenId:
    // 1. from('diagnostic_access_tokens').select.eq.single  → token not found
    // 2. from('diagnostic_test_results').select.eq.limit.single  → no existing by token
    // 3. from('diagnostic_test_results').select.eq.eq.gte.limit.maybeSingle → no secondary dup
    // 4. from('diagnostic_test_results').insert.select → success
    // 5. from('diagnostic_access_tokens').update.eq.is → mark used (no-op)
    // 6. from('diagnostic_test_results').update.eq → slack update (no-op)

    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: 'result-123' }], error: null }),
    });

    let fromCallCount = 0;
    mockFrom.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 4) {
        return { insert: insertSpy };
      }
      return makeChain({ data: null, error: null });
    });

    const savedWords = [
      { word: 'epitome', questionId: 'q1', section: 'passage' as const, optionId: null, positionIndex: 5 },
    ];

    const req = {
      json: async () => ({
        tokenId: 'token-123',
        studentEmail: 'test@example.com',
        studentName: 'Test Student',
        testId: 'diagnostic-test-1',
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        totalTimeSeconds: 1800,
        answers: { q1: 'A' },
        confidenceLevels: { q1: 4 },
        flaggedQuestions: [],
        questionTimes: { q1: 120 },
        savedWords,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalled();
    const payload = insertSpy.mock.calls[0][0][0];
    expect(payload.saved_words).toEqual(savedWords);
  });

  it('should default savedWords to empty array when not provided', async () => {
    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: 'result-456' }], error: null }),
    });

    let fromCallCount = 0;
    mockFrom.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 4) {
        return { insert: insertSpy };
      }
      return makeChain({ data: null, error: null });
    });

    const req = {
      json: async () => ({
        tokenId: 'token-123',
        studentEmail: 'test@example.com',
        studentName: 'Test Student',
        testId: 'diagnostic-test-1',
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        totalTimeSeconds: 1800,
        answers: { q1: 'A' },
        confidenceLevels: { q1: 4 },
        flaggedQuestions: [],
        questionTimes: { q1: 120 },
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalled();
    const payload = insertSpy.mock.calls[0][0][0];
    expect(payload.saved_words).toEqual([]);
  });
});
