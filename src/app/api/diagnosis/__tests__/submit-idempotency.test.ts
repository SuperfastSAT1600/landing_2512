/// <reference types="vitest/globals" />
/**
 * REQ-003: API idempotency — duplicate submission within 60s returns existing result
 */
import { POST } from '../submit/route';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;

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

function makeRequest(body: object): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

describe('REQ-003: POST /api/diagnosis/submit idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('REQ-003: returns existing resultId and status 200 when duplicate within 60s', async () => {
    // No tokenId → first from() call is the duplicate check
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'existing-result-id' }],
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const response = await POST(makeRequest(baseBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.resultId).toBe('existing-result-id');
  });

  it('REQ-003: proceeds to insert when no recent duplicate exists', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: 'new-result-id' }],
        error: null,
      }),
    });

    // No tokenId → first from() = duplicate check (no results), second from() = insert
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: mockInsert,
      });

    const response = await POST(makeRequest(baseBody));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.resultId).toBe('new-result-id');
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it('REQ-003: proceeds to insert when duplicate check returns null data', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: 'new-result-id' }],
        error: null,
      }),
    });

    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: mockInsert,
      });

    const response = await POST(makeRequest(baseBody));
    expect(response.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledOnce();
  });
});
