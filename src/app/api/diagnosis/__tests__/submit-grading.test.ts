// @vitest-environment node
/// <reference types="vitest/globals" />
import { POST } from '../submit/route';
import { NextRequest } from 'next/server';
import { diagnosticTest2Vocab } from '@/app/diagnosis/data/diagnostic-test-2-vocab';

const insertSpy = vi.fn();

vi.mock('@/lib/supabase-admin', () => {
  const chain = (result: unknown) => {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gte', 'limit', 'is', 'update']) c[m] = () => c;
    c.single = () => Promise.resolve(result);
    c.maybeSingle = () => Promise.resolve(result);
    return c;
  };
  return {
    supabaseAdmin: {
      from: (table: string) => {
        if (table === 'diagnostic_test_versions') {
          return chain({
            data: {
              questions: [
                {
                  id: 'r1',
                  type: 'multiple-choice',
                  section: 'Reading and Writing',
                  domain: 'Craft and Structure',
                  skill: 's',
                  difficulty: 'Easy',
                  question: 'q',
                  options: [
                    { id: 'A', text: 'a', type: 'distractor' },
                    { id: 'B', text: 'b', type: 'correct' },
                  ],
                },
              ],
            },
            error: null,
          });
        }
        return {
          ...chain({ data: null, error: null }),
          insert: (rows: unknown[]) => {
            insertSpy(rows);
            return { select: () => Promise.resolve({ data: [{ id: 'res-1' }], error: null }) };
          },
        };
      },
    },
  };
});

vi.mock('@/lib/slack', () => ({ notifyTestSubmission: vi.fn().mockResolvedValue(undefined) }));

const word = diagnosticTest2Vocab[0];
const correctId = word.options.find((o) => o.type === 'correct')!.id;
const wrongId = word.options.find((o) => o.type !== 'correct')!.id;

const body = {
  studentName: 'S',
  testId: 'diagnostic-test-2',
  testVersionId: 'ver-1',
  startedAt: '2026-10-01T00:00:00Z',
  submittedAt: '2026-10-01T00:30:00Z',
  totalTimeSeconds: 1800,
  answers: {},
  confidenceLevels: {},
  flaggedQuestions: [],
  questionTimes: {},
  // 클라이언트가 isCorrect를 조작해서 보낸다
  rwSequentialData: [
    { questionId: 'r1', firstYesOptionId: 'A', optionsViewedCount: 1, finalAnswer: 'A', confidence: 90, isCorrect: true },
  ],
  vocabAnswers: [
    { wordId: word.id, selectedOptionId: wrongId, timeTaken: 2, isCorrect: true },
    { wordId: word.id, selectedOptionId: correctId, timeTaken: 2, isCorrect: false },
  ],
};

describe('POST /api/diagnosis/submit server grading', () => {
  beforeEach(() => insertSpy.mockClear());

  it('REQ-008: stores server-computed isCorrect for rw and vocab, ignoring client values', async () => {
    const res = await POST({ json: async () => body } as unknown as NextRequest);
    expect(res.status).toBe(201);
    const stored = insertSpy.mock.calls[0][0][0].answers;
    expect(stored.rw[0].isCorrect).toBe(false);
    expect(stored.vocab.map((v: { isCorrect: boolean }) => v.isCorrect)).toEqual([false, true]);
  });
});
