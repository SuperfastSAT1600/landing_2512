import { describe, it, expect, vi, beforeEach } from 'vitest';

// Qwen SDK와 ASR 모듈을 모킹해 네트워크·키 없이 검증한다.
const { messagesCreate, transcribeWithQwen } = vi.hoisted(() => ({
  messagesCreate: vi.fn(),
  transcribeWithQwen: vi.fn(),
}));

vi.mock('@/lib/qwen', () => ({
  getQwenAnthropicClient: () => ({ messages: { create: messagesCreate } }),
  qwenModel: (t: string) => (t === 'strong' ? 'qwen-max' : 'qwen-turbo'),
}));
vi.mock('@/lib/qwen-asr', () => ({
  transcribeAudioUrlWithQwen: (url: string) => transcribeWithQwen(url),
}));

import {
  transcribeAudioUrl,
  summarizeTranscriptWithQwen,
  withRetry,
  isQuotaError,
  QuotaExhaustedError,
} from '@/lib/plaud-transcribe';

const qwenText = (t: string) => ({ content: [{ type: 'text', text: t }] });
const quotaError = () =>
  Object.assign(new Error('429 no credits remaining'), {
    status: 429,
    type: 'insufficient_quota',
    code: 'credit_balance_exhausted',
  });

describe('transcribeAudioUrl', () => {
  beforeEach(() => transcribeWithQwen.mockReset());

  it('Qwen 파일 전사에 URL을 그대로 위임한다 (서버가 오디오를 내려받지 않음)', async () => {
    transcribeWithQwen.mockResolvedValueOnce('화자1: 안녕하세요');
    await expect(transcribeAudioUrl('https://s3/a.mp3')).resolves.toBe('화자1: 안녕하세요');
    expect(transcribeWithQwen).toHaveBeenCalledWith('https://s3/a.mp3');
  });

  it('전사 실패는 그대로 전파한다 (라우트가 502로 매핑)', async () => {
    transcribeWithQwen.mockRejectedValueOnce(new Error('전사 실패'));
    await expect(transcribeAudioUrl('https://s3/a.mp3')).rejects.toThrow('전사 실패');
  });
});

describe('isQuotaError', () => {
  it('크레딧/쿼터 소진 형태를 인식한다', () => {
    expect(isQuotaError(quotaError())).toBe(true);
    expect(isQuotaError({ error: { type: 'insufficient_quota' } })).toBe(true);
    expect(isQuotaError({ status: 429 })).toBe(false); // 일반 rate limit
    expect(isQuotaError(null)).toBe(false);
  });
});

describe('withRetry', () => {
  it('일시적 429는 재시도한다', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('rate limit'), { status: 429 }))
      .mockResolvedValueOnce('복구됨');
    await expect(withRetry(fn, { sleep: async () => {} })).resolves.toBe('복구됨');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('크레딧 소진(429 insufficient_quota)은 재시도하지 않는다', async () => {
    const fn = vi.fn().mockRejectedValue(quotaError());
    await expect(withRetry(fn, { sleep: async () => {} })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('summarizeTranscriptWithQwen', () => {
  beforeEach(() => messagesCreate.mockReset());

  it('빈 전사 → throw, Qwen 호출 안 함', async () => {
    await expect(summarizeTranscriptWithQwen('   ')).rejects.toThrow();
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it('전사 → Qwen 요약 단일 호출, {transcript, summary} 반환', async () => {
    messagesCreate.mockResolvedValueOnce(qwenText('[핵심 요약]\n서윤 학생 상담\n\n[현황]\n- 1600 목표'));
    const r = await summarizeTranscriptWithQwen('화자1: 안녕하세요 상담입니다');
    expect(messagesCreate).toHaveBeenCalledTimes(1);
    expect(r.transcript).toBe('화자1: 안녕하세요 상담입니다'); // 원본 전사 그대로
    expect(r.summary).toContain('핵심 요약');
  });

  it('요약 프롬프트가 화자 라벨 해석을 지시한다 (회귀)', async () => {
    messagesCreate.mockResolvedValueOnce(qwenText('[핵심 요약]\nok'));
    await summarizeTranscriptWithQwen('화자1: 여보세요\n화자2: 안녕하세요');
    const system = messagesCreate.mock.calls[0][0].system[0].text as string;
    expect(system).toContain('화자1');
    expect(system).toContain('세일즈 담당자');
  });

  it('Qwen 크레딧 소진 → QuotaExhaustedError (라우트 402)', async () => {
    // Once로 둔다 — 영구 구현이 남으면 vitest(v4)가 해당 에러를 테스트 실패로 다시 올린다.
    messagesCreate.mockImplementationOnce(() => {
      throw quotaError();
    });
    await expect(summarizeTranscriptWithQwen('x')).rejects.toBeInstanceOf(QuotaExhaustedError);
    expect(messagesCreate).toHaveBeenCalledTimes(1); // 재시도 없음
  });

  it('요약이 비면 throw', async () => {
    messagesCreate.mockResolvedValueOnce(qwenText('   '));
    await expect(summarizeTranscriptWithQwen('x')).rejects.toThrow();
  });

  it('요약이 한국어→중국어로 드리프트하면 중국어 꼬리를 잘라 한국어만 남긴다 (회귀)', async () => {
    const drifted =
      '[핵심 요약]\n- 1600 목표\n\n[다음 액션]\n- 진단 테스트 준비\n\n' +
      '[核心需求]\n- 希望为正在UAE就读A-Level课程的儿子准备SAT考试\n- 目标是达到1500分以上';
    messagesCreate.mockResolvedValueOnce(qwenText(drifted));
    const r = await summarizeTranscriptWithQwen('x');
    expect(r.summary).toContain('핵심 요약');
    expect(r.summary).toContain('1600 목표');
    expect(r.summary).not.toContain('核心需求');
    expect(r.summary).not.toMatch(/[一-鿿]/); // 한자 없음
  });
});
