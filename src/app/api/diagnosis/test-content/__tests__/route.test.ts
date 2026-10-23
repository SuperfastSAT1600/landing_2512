// @vitest-environment node
/// <reference types="vitest/globals" />
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { fallbackQuestions } from '@/lib/diagnosis-test-source';

const dbVersion = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => dbVersion() }) }),
    }),
  },
}));

const request = (query = '') =>
  new NextRequest(`http://localhost/api/diagnosis/test-content${query}`);

describe('GET /api/diagnosis/test-content', () => {
  beforeEach(() => dbVersion.mockReset());

  it('REQ-007: DB version response contains no answer key', async () => {
    dbVersion.mockResolvedValue({
      data: {
        id: 'v1',
        version_number: 1,
        title: 'Set',
        time_limit_minutes: 30,
        directions: null,
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
          { id: 'm1', type: 'short-answer', section: 'Math', domain: 'Algebra', skill: 's', difficulty: 'Hard', question: 'q', answers: ['42'] },
        ],
      },
      error: null,
    });
    const res = await GET(request('?versionId=v1'));
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain('"correct"');
    expect(text).not.toContain('"distractor"');
    expect(text).not.toContain('"answers"');
    expect(text).toContain('"id":"r1"');
  });

  it('REQ-007: hardcoded fallback is sanitized too and includes vocab without answers', async () => {
    const res = await GET(request('?testId=diagnostic-test-2'));
    const body = await res.json();
    const text = JSON.stringify(body);
    expect(text).not.toContain('"correct"');
    expect(text).not.toContain('"distractor"');
    expect(text).not.toContain('"answers"');
    expect(Array.isArray(body.vocab)).toBe(true);
    expect(body.vocab.length).toBeGreaterThan(0);
    expect(body.vocab[0].options[0]).toEqual({ id: expect.any(String), text: expect.any(String) });
  });

  it('REQ-007: a DB set without RW falls back to the questions of the requested format', async () => {
    dbVersion.mockResolvedValue({
      data: {
        id: 'v2', version_number: 1, title: 'Set', time_limit_minutes: 30, directions: null,
        questions: [{ id: 'm1', type: 'short-answer', section: 'Math', domain: 'Algebra', skill: 's', difficulty: 'Easy', question: 'q' }],
      },
      error: null,
    });
    const body = await (await GET(request('?versionId=v2&testId=diagnostic-test-2'))).json();
    const expected = fallbackQuestions('diagnostic-test-2').map((q) => q.id);
    expect(body.questions.map((q: { id: string }) => q.id)).toEqual(expected);
  });
});
