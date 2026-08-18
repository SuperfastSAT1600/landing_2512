// @vitest-environment node
/// <reference types="vitest/globals" />
/**
 * REQ-003: API idempotency — duplicate submission is detected and returns existing result
 */
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

// Build a fluent Supabase chain that resolves to `result` at the terminal call
function makeChain(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const terminal = vi.fn().mockResolvedValue(result);

  ['select', 'eq', 'neq', 'gte', 'lte', 'limit', 'is', 'order', 'update'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain['single'] = terminal;
  chain['maybeSingle'] = terminal;
  chain['insert'] = vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue(result),
  });
  return chain;
}

function makeRequest(body: object): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const baseBody = {
  studentEmail: 'test@example.com',
  studentName: 'Test Student',
  testId: 'diagnostic-test-1',
  startedAt: new Date().toISOString(),
  submittedAt: new Date().toISOString(),
  totalTimeSeconds: 1800,
  answers: {},
  confidenceLevels: {},
  flaggedQuestions: [],
  questionTimes: {},
};

describe('REQ-003: POST /api/diagnosis/submit idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('REQ-003: returns existing resultId and status 200 when secondary guard detects duplicate', async () => {
    // No tokenId → skips token blocks.
    // First from(): secondary guard (student+test, 30 days) → existing result found → 200
    mockFrom.mockImplementation(() =>
      makeChain({ data: { id: 'existing-result-id' }, error: null })
    );

    const response = await POST(makeRequest(baseBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.resultId).toBe('existing-result-id');
  });

  it('REQ-003: returns existing resultId and status 200 when email guard detects recent duplicate', async () => {
    // No tokenId.
    // First from(): secondary guard → no dup
    // Second from(): email guard (10 min) → recent result found → 200
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: null, error: null }); // secondary guard: no dup
      // email guard: returns an array with existing entry
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [{ id: 'recent-result-id' }], error: null }),
              }),
            }),
          }),
        }),
      };
    });

    const response = await POST(makeRequest(baseBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.resultId).toBe('recent-result-id');
  });

  it('REQ-003: proceeds to insert when no recent duplicate exists', async () => {
    // No tokenId.
    // from() 1: secondary guard → no dup
    // from() 2: email guard → no recent
    // from() 3: insert → new result
    // from() 4+: slack update (no-op)

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: 'new-result-id' }], error: null }),
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // secondary guard: no dup
        return makeChain({ data: null, error: null });
      }
      if (callCount === 2) {
        // email guard: empty array
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (callCount === 3) {
        return { insert: mockInsert };
      }
      // slack update
      return makeChain({ data: null, error: null });
    });

    const response = await POST(makeRequest(baseBody));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.resultId).toBe('new-result-id');
    expect(mockInsert).toHaveBeenCalledOnce();
  });
});
