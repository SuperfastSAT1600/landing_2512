import { describe, it, expect, vi, beforeEach } from 'vitest';

// OpenAI SDK를 모킹해 네트워크·키 없이 "어디로 어떤 파라미터로 붙는지"만 검증한다.
// (DashScope는 OpenAI 호환 엔드포인트를 제공하므로 클라이언트는 그대로 쓰고 baseURL만 바꾼다.)
const { embeddingsCreate, ctorArgs } = vi.hoisted(() => ({
  embeddingsCreate: vi.fn(),
  ctorArgs: [] as Array<{ apiKey?: string; baseURL?: string }>,
}));

vi.mock('openai', () => ({
  default: class {
    embeddings = { create: embeddingsCreate };
    constructor(opts: { apiKey?: string; baseURL?: string }) {
      ctorArgs.push(opts);
    }
  },
}));

import { generateEmbedding, buildEmbeddingText } from '@/lib/embedding';

const VECTOR = Array.from({ length: 1536 }, (_, i) => i / 1536);

describe('generateEmbedding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ctorArgs.length = 0;
    process.env.QWEN_API_KEY = 'test-key';
    process.env.QWEN_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
    delete process.env.QWEN_EMBEDDING_MODEL;
    embeddingsCreate.mockResolvedValue({ data: [{ embedding: VECTOR }] });
  });

  it('Qwen 호환 엔드포인트로 붙어 1536차원 벡터를 반환한다', async () => {
    const out = await generateEmbedding('테스트 문장');

    expect(ctorArgs[0]).toMatchObject({
      apiKey: 'test-key',
      baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    });
    expect(embeddingsCreate).toHaveBeenCalledWith({
      model: 'text-embedding-v4',
      input: '테스트 문장',
      dimensions: 1536,
    });
    expect(out).toHaveLength(1536);
  });

  it('QWEN_EMBEDDING_MODEL로 모델을 덮어쓸 수 있다', async () => {
    process.env.QWEN_EMBEDDING_MODEL = 'text-embedding-v3';
    await generateEmbedding('x');
    expect(embeddingsCreate.mock.calls[0][0].model).toBe('text-embedding-v3');
  });

  it('토큰 한도 안전 마진으로 8000자까지만 보낸다', async () => {
    await generateEmbedding('가'.repeat(9000));
    expect(embeddingsCreate.mock.calls[0][0].input).toHaveLength(8000);
  });

  it('QWEN_API_KEY 미설정이면 요청하지 않고 throw', async () => {
    delete process.env.QWEN_API_KEY;
    await expect(generateEmbedding('x')).rejects.toThrow(/QWEN_API_KEY/);
    expect(embeddingsCreate).not.toHaveBeenCalled();
  });

  it('차원이 기대와 다르면 throw — 공급자/모델 오설정을 조용히 넘기지 않는다', async () => {
    embeddingsCreate.mockResolvedValueOnce({ data: [{ embedding: [1, 2, 3] }] });
    await expect(generateEmbedding('x')).rejects.toThrow(/1536/);
  });
});

describe('buildEmbeddingText', () => {
  it('campaign_tags를 포함한다 — 과목 의도(AP 문의)가 임베딩에 실려야 상품 매칭이 된다', () => {
    const text = buildEmbeddingText({
      name: '홍길동',
      grade: '10학년',
      campaign_tags: ['AP 문의', 'Calculus AB / BC'],
    });
    expect(text).toContain('AP 문의');
    expect(text).toContain('Calculus AB / BC');
  });

  it('상담 기록을 시간순으로 넣고 빈 메모는 건너뛴다', () => {
    const text = buildEmbeddingText({
      name: '홍길동',
      consultation_timeline: [
        { created_at: '2026-03-02T00:00:00Z', raw_memo: '두번째' },
        { created_at: '2026-03-01T00:00:00Z', raw_memo: '첫번째' },
        { created_at: '2026-03-03T00:00:00Z', raw_memo: '   ' },
      ],
    });
    expect(text.indexOf('첫번째')).toBeLessThan(text.indexOf('두번째'));
    expect(text).not.toContain('2026-03-03');
  });

  it('없는 필드는 줄 자체를 만들지 않는다', () => {
    const text = buildEmbeddingText({ name: '홍길동' });
    expect(text).toBe('이름: 홍길동');
  });
});
