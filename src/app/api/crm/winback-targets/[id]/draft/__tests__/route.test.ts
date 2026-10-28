import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const createQwen = vi.fn();
vi.mock('@/lib/qwen', () => ({
  isQwenConfigured: () => true,
  getQwenAnthropicClient: () => ({ messages: { create: createQwen } }),
  qwenModel: (tier: string) => `qwen-${tier}-tier`,
}));
vi.mock('@/lib/anthropic-error', () => ({ anthropicErrorMessage: () => 'qwen error' }));

const update = vi.fn();
const target = {
  id: 't1',
  sent_at: null,
  signals: [],
  play: { title: '캠페인', product_brief: 'SAT 1:1' },
  variant: null,
  student: {
    id: 's1', name: '학생', grade: '11th', parent_phone: '', lead_status: 'inactive', churn_tag: null,
    consultation_timeline: [{ created_at: '2026-10-09T00:00:00Z', raw_memo: '9월 1420점, 12월 1500 목표' }],
  },
};
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: target, error: null }) }) }),
      update: (row: unknown) => {
        update(row);
        return { eq: () => ({ select: () => ({ single: async () => ({ data: { ...target, ...(row as object) }, error: null }) }) }) };
      },
    }),
  },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';
const req = () =>
  new NextRequest('http://localhost/api/crm/winback-targets/t1/draft', { method: 'POST', headers: { 'x-admin-key': 'admin-key' } });
const params = { params: Promise.resolve({ id: 't1' }) };

// REQ-001·002 (winback-draft-model)
describe('POST /api/crm/winback-targets/[id]/draft — 모델', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.WINBACK_DRAFT_MODEL;
    createQwen.mockResolvedValue({ content: [{ type: 'text', text: '{"message_draft":"안녕하세요"}' }] });
  });

  it('기본은 qwen-plus로 생성하고 그 모델명을 저장한다', async () => {
    const { POST } = await import('../route');
    expect((await POST(req(), params)).status).toBe(200);
    expect(createQwen.mock.calls[0][0].model).toBe('qwen-plus');
    expect(update.mock.calls[0][0]).toMatchObject({ message_draft: '안녕하세요', message_model: 'qwen-plus' });
  });

  it('WINBACK_DRAFT_MODEL로 바꿀 수 있다', async () => {
    process.env.WINBACK_DRAFT_MODEL = 'qwen-max';
    const { POST } = await import('../route');
    await POST(req(), params);
    expect(createQwen.mock.calls[0][0].model).toBe('qwen-max');
    expect(update.mock.calls[0][0].message_model).toBe('qwen-max');
  });

  // REQ-004 (winback-draft-memo)
  it('학생 상담 메모를 프롬프트에 넣는다', async () => {
    const { POST } = await import('../route');
    await POST(req(), params);
    const content = createQwen.mock.calls[0][0].messages[0].content as string;
    expect(content).toContain('[2026-10-09] 9월 1420점, 12월 1500 목표');
    expect(content).toMatch(/오늘: \d{4}-\d{2}-\d{2}/);
  });
});
