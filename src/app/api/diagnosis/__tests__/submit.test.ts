import { POST } from '../submit/route';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

const mockSupabaseAdmin = supabaseAdmin as jest.Mocked<typeof supabaseAdmin>;

describe('POST /api/diagnosis/submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject request with missing required fields', async () => {
    const mockRequest = {
      json: async () => ({
        studentEmail: 'test@example.com',
        // missing tokenId, studentName, testId
      }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
  });

  it('should reject request with invalid token', async () => {
    mockSupabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Not found'),
            }),
          }),
        }),
      }),
    } as any);

    const mockRequest = {
      json: async () => ({
        tokenId: 'invalid-token',
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
      }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(401);
  });

  it('should include savedWords in the submission payload', async () => {
    const mockInsertFn = jest.fn().mockResolvedValue({
      data: [{ id: 'result-123' }],
      error: null,
    });

    mockSupabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'token-123' },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    mockSupabaseAdmin.from.mockReturnValueOnce({
      insert: mockInsertFn,
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'token-123' },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const savedWords = [
      {
        word: 'epitome',
        questionId: 'q1',
        section: 'passage' as const,
        optionId: null,
        positionIndex: 5,
      },
    ];

    const mockRequest = {
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

    await POST(mockRequest);

    // Verify that insert was called with savedWords
    expect(mockInsertFn).toHaveBeenCalled();
    const insertCall = mockInsertFn.mock.calls[0];
    expect(insertCall[0][0]).toHaveProperty('saved_words');
    expect(insertCall[0][0].saved_words).toEqual(savedWords);
  });

  it('should default savedWords to empty array when not provided', async () => {
    const mockInsertFn = jest.fn().mockResolvedValue({
      data: [{ id: 'result-123' }],
      error: null,
    });

    mockSupabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'token-123' },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    mockSupabaseAdmin.from.mockReturnValueOnce({
      insert: mockInsertFn,
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'token-123' },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const mockRequest = {
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
        // savedWords not provided
      }),
    } as unknown as NextRequest;

    await POST(mockRequest);

    expect(mockInsertFn).toHaveBeenCalled();
    const insertCall = mockInsertFn.mock.calls[0];
    expect(insertCall[0][0].saved_words).toEqual([]);
  });
});
