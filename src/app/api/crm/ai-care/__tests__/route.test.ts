import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const createQwen = vi.fn();
const qwenConfigured = vi.fn();
const openaiCreate = vi.fn();
vi.mock('@/lib/qwen', () => ({
  isQwenConfigured: qwenConfigured,
  getQwenAnthropicClient: () => ({ messages: { create: createQwen } }),
  qwenModel: () => 'qwen-test',
}));
vi.mock('@/lib/anthropic-error', () => ({ anthropicErrorMessage: () => 'qwen error' }));
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: openaiCreate } };
  },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';
function req(body: unknown, key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/ai-care', {
    method: 'POST',
    headers: { 'x-admin-key': key, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
const response = (text: string) => ({ content: [{ type: 'text', text }] });

describe('POST /api/crm/ai-care', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'openai';
  });

  it('rejects unauthorized and invalid input', async () => {
    const { POST } = await import('../route');
    expect((await POST(req({ raw_memo: 'x' }, 'bad'))).status).toBe(401);
    expect((await POST(req({ raw_memo: ' ' }))).status).toBe(400);
  });

  it('uses Qwen when configured', async () => {
    qwenConfigured.mockReturnValue(true);
    createQwen.mockResolvedValue(
      response('{"purified":"공개","deleted_items":[],"coach_history":""}')
    );
    const { POST } = await import('../route');
    const res = await POST(req({ raw_memo: '내부' }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.purified).toBe('공개');
    expect(createQwen).toHaveBeenCalled();
    expect(openaiCreate).not.toHaveBeenCalled();
  });

  it('falls back to OpenAI when Qwen is not configured', async () => {
    qwenConfigured.mockReturnValue(false);
    openaiCreate.mockResolvedValue({ choices: [{ message: { content: '{"purified":"공개"}' } }] });
    const { POST } = await import('../route');
    expect((await POST(req({ raw_memo: '내부' }))).status).toBe(200);
    expect(openaiCreate).toHaveBeenCalled();
  });

  it('returns a provider error for Qwen failures', async () => {
    qwenConfigured.mockReturnValue(true);
    createQwen.mockRejectedValue(new Error('down'));
    const { POST } = await import('../route');
    const res = await POST(req({ raw_memo: '내부' }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe('qwen error');
  });
});
