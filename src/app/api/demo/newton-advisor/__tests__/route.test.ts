import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  isQwenConfigured: vi.fn(() => true),
  create: vi.fn(),
}));

vi.mock('@/lib/qwen', () => ({
  isQwenConfigured: mocks.isQwenConfigured,
  qwenModel: () => 'qwen-max',
  getQwenAnthropicClient: () => ({ messages: { create: mocks.create } }),
}));

import { POST } from '../route';

const req = (body: unknown, ip = '1.2.3.4') =>
  new NextRequest('http://localhost/api/demo/newton-advisor', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const NOTE = { note: 'Father called and asked about the economics elective.' };

beforeEach(() => {
  mocks.isQwenConfigured.mockReturnValue(true);
  mocks.create.mockReset();
});

describe('POST /api/demo/newton-advisor — 어떤 경로로도 에러 화면이 나오지 않는다', () => {
  it('LLM 미설정이면 재생형 플랜으로 200 폴백', async () => {
    mocks.isQwenConfigured.mockReturnValue(false);
    const res = await POST(req(NOTE, '10.0.0.1'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.live).toBe(false);
    expect(json.data.reason).toBe('llm-unconfigured');
    expect(json.data.plan.signals.length).toBeGreaterThan(0);
  });

  it('LLM 호출이 던져도 200 폴백', async () => {
    mocks.create.mockRejectedValue(new Error('upstream down'));
    const res = await POST(req(NOTE, '10.0.0.2'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.reason).toBe('llm-error');
    expect(json.data.plan.summary.length).toBeGreaterThan(0);
  });

  it('응답이 JSON이 아니면 200 폴백', async () => {
    mocks.create.mockResolvedValue({ content: [{ type: 'text', text: 'sorry, I cannot' }] });
    const res = await POST(req(NOTE, '10.0.0.3'));
    const json = await res.json();
    expect(json.data.reason).toBe('unparsable');
    expect(json.data.live).toBe(false);
  });

  it('본문이 깨져도 200 폴백', async () => {
    const res = await POST(req('not-json', '10.0.0.4'));
    expect((await res.json()).data.reason).toBe('bad-request');
  });

  it('빈 노트는 LLM을 호출하지 않고 폴백', async () => {
    const res = await POST(req({ note: '   ' }, '10.0.0.5'));
    expect((await res.json()).data.reason).toBe('empty-note');
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe('정상 응답', () => {
  it('파싱 가능한 JSON이면 live=true로 플랜을 돌려준다', async () => {
    mocks.create.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            summary: 'new summary',
            signals: [{ title: 'S', detail: 'd', severity: 'critical', noteIds: ['note-01'] }],
            thisWeek: [
              { task: 'Do it', owner: 'A', due: 'by Friday', why: 'w', value: 'Empower Minds', noteIds: [] },
            ],
          }),
        },
      ],
    });
    const res = await POST(req(NOTE, '10.0.0.6'));
    const json = await res.json();
    expect(json.data.live).toBe(true);
    expect(json.data.plan.summary).toBe('new summary');
  });

  it('노트를 2000자로 자른다', async () => {
    mocks.create.mockResolvedValue({ content: [{ type: 'text', text: 'nope' }] });
    await POST(req({ note: 'x'.repeat(5000) }, '10.0.0.7'));
    const sent = mocks.create.mock.calls[0][0].messages[0].content as string;
    expect(sent).toContain('x'.repeat(2000));
    expect(sent).not.toContain('x'.repeat(2001));
  });
});

describe('rate limit', () => {
  it('같은 IP가 분당 5회를 넘기면 LLM을 더 호출하지 않는다', async () => {
    mocks.create.mockResolvedValue({ content: [{ type: 'text', text: 'nope' }] });
    for (let i = 0; i < 5; i++) await POST(req(NOTE, '9.9.9.9'));
    const before = mocks.create.mock.calls.length;

    const res = await POST(req(NOTE, '9.9.9.9'));
    const json = await res.json();
    expect(json.data.reason).toBe('rate-limited');
    expect(mocks.create.mock.calls.length).toBe(before);
    expect(json.data.plan.signals.length).toBeGreaterThan(0);
  });
});
