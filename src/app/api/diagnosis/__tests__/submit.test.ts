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

const mockLogLeadEvent = vi.fn().mockResolvedValue(true);
vi.mock('@/lib/lead-events', () => ({
  logLeadEvent: (...args: unknown[]) => mockLogLeadEvent(...args),
  LEAD_EVENT_DEDUP_MINUTES: 30,
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

describe('POST /api/diagnosis/submit — auto-link via token student_id (REQ-003a)', () => {
  beforeEach(() => vi.clearAllMocks());

  const baseBody = {
    tokenId: 'token-123',
    studentEmail: 'test@example.com',
    studentName: 'Test Student',
    testId: 'diagnostic-test-1',
    startedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    totalTimeSeconds: 1800,
    answers: { q1: 'A' },
    confidenceLevels: {},
    flaggedQuestions: [],
    questionTimes: {},
  };

  // 테이블 인지 mock: update 호출을 (table, payload)로 기록
  function setupTables(opts: {
    tokenStudentId: string | null;
    existingDiagnosticResultId: string | null;
  }) {
    const updateCalls: Array<{ table: string; payload: Record<string, unknown> }> = [];
    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: 'result-123' }], error: null }),
    });

    function chain(table: string, result: { data?: unknown; error?: unknown }) {
      const c: Record<string, ReturnType<typeof vi.fn>> = {};
      ['select', 'eq', 'gte', 'limit', 'is', 'order'].forEach((m) => {
        c[m] = vi.fn().mockReturnValue(c);
      });
      c['single'] = vi.fn().mockResolvedValue(result);
      c['maybeSingle'] = vi.fn().mockResolvedValue(result);
      c['update'] = vi.fn((payload: Record<string, unknown>) => {
        updateCalls.push({ table, payload });
        return c;
      });
      return c;
    }

    let tokenCalls = 0;
    let resultsCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'diagnostic_access_tokens') {
        tokenCalls++;
        return chain(
          table,
          tokenCalls === 1
            ? {
                data: {
                  id: 'token-123',
                  time_limit_minutes: 30,
                  is_active: true,
                  student_id: opts.tokenStudentId,
                },
                error: null,
              }
            : { data: null, error: null }
        );
      }
      if (table === 'students') {
        return chain(table, {
          data: { diagnostic_result_id: opts.existingDiagnosticResultId },
          error: null,
        });
      }
      // diagnostic_test_results: 1=기존 토큰 결과 확인, 2=중복 가드, 3=insert, 이후=update들
      resultsCalls++;
      if (resultsCalls === 3) return { insert: insertSpy };
      return chain(table, { data: null, error: null });
    });

    return { updateCalls, insertSpy };
  }

  it('links result and student, and logs diagnostic_submitted', async () => {
    const { updateCalls } = setupTables({
      tokenStudentId: 'stu-9',
      existingDiagnosticResultId: null,
    });

    const req = { json: async () => baseBody } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(201);

    expect(updateCalls).toContainEqual({
      table: 'diagnostic_test_results',
      payload: { student_id: 'stu-9' },
    });
    expect(updateCalls).toContainEqual({
      table: 'students',
      payload: { diagnostic_result_id: 'result-123' },
    });
    expect(mockLogLeadEvent).toHaveBeenCalledWith('stu-9', 'diagnostic_submitted', {
      metadata: { matched_by: 'token', result_id: 'result-123' },
    });
  });

  it('never overwrites an existing diagnostic_result_id but still logs the event', async () => {
    const { updateCalls } = setupTables({
      tokenStudentId: 'stu-9',
      existingDiagnosticResultId: 'already-linked',
    });

    const req = { json: async () => baseBody } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(201);

    expect(
      updateCalls.filter((c) => c.table === 'students' && 'diagnostic_result_id' in c.payload)
    ).toHaveLength(0);
    expect(updateCalls).toContainEqual({
      table: 'diagnostic_test_results',
      payload: { student_id: 'stu-9' },
    });
    expect(mockLogLeadEvent).toHaveBeenCalledWith('stu-9', 'diagnostic_submitted', {
      metadata: { matched_by: 'token', result_id: 'result-123' },
    });
  });

  it('does nothing extra when the token has no student_id', async () => {
    const { updateCalls } = setupTables({
      tokenStudentId: null,
      existingDiagnosticResultId: null,
    });

    const req = { json: async () => baseBody } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(201);

    expect(updateCalls.filter((c) => c.table === 'students')).toHaveLength(0);
    expect(
      updateCalls.filter(
        (c) => c.table === 'diagnostic_test_results' && 'student_id' in c.payload
      )
    ).toHaveLength(0);
    expect(mockLogLeadEvent).not.toHaveBeenCalled();
  });
});
