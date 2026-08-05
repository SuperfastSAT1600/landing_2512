import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// OpenAI STT + Qwen SDK를 모킹해 네트워크·키 없이 검증한다.
const { transcriptionsCreate, messagesCreate } = vi.hoisted(() => ({
  transcriptionsCreate: vi.fn(),
  messagesCreate: vi.fn(),
}));

vi.mock('openai', () => ({
  default: class {
    audio = { transcriptions: { create: transcriptionsCreate } };
  },
  toFile: vi.fn(async () => ({})),
}));
vi.mock('@/lib/qwen', () => ({
  getQwenAnthropicClient: () => ({ messages: { create: messagesCreate } }),
  qwenModel: (t: string) => (t === 'strong' ? 'qwen-max' : 'qwen-turbo'),
}));

import { toFile } from 'openai';
import {
  transcribeAudioUrl,
  summarizeTranscriptWithQwen,
  AudioTooLargeError,
  MAX_AUDIO_BYTES,
} from '@/lib/plaud-transcribe';

function mockFetch(res: { ok: boolean; status?: number; bytes?: number; contentType?: string }) {
  const buf = new ArrayBuffer(res.bytes ?? 1024);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: res.ok,
      status: res.status ?? (res.ok ? 200 : 500),
      arrayBuffer: async () => buf,
      headers: { get: () => res.contentType ?? 'audio/mp4' },
    })),
  );
}

const qwenText = (t: string) => ({ content: [{ type: 'text', text: t }] });

describe('transcribeAudioUrl', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    transcriptionsCreate.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('정상 오디오(≤24MB) → OpenAI STT 텍스트를 trim해 반환', async () => {
    mockFetch({ ok: true, bytes: 1024 });
    transcriptionsCreate.mockResolvedValueOnce({ text: '  안녕하세요 상담입니다  ' });
    await expect(transcribeAudioUrl('https://x/audio.m4a')).resolves.toBe('안녕하세요 상담입니다');
  });

  it('binary/octet-stream이어도 URL 확장자(.mp3)로 판별 → plaud.mp3/audio/mpeg로 STT (회귀)', async () => {
    mockFetch({ ok: true, bytes: 1024, contentType: 'binary/octet-stream' });
    transcriptionsCreate.mockResolvedValueOnce({ text: 'ok' });
    await transcribeAudioUrl('https://s3/audiofiles/abc.mp3?X-Amz-Foo=bar');
    expect(vi.mocked(toFile)).toHaveBeenCalledWith(expect.anything(), 'plaud.mp3', { type: 'audio/mpeg' });
  });

  it('24MB 초과 → AudioTooLargeError, STT 호출 안 함', async () => {
    mockFetch({ ok: true, bytes: MAX_AUDIO_BYTES + 1 });
    await expect(transcribeAudioUrl('https://x/big.m4a')).rejects.toBeInstanceOf(AudioTooLargeError);
    expect(transcriptionsCreate).not.toHaveBeenCalled();
  });

  it('다운로드 실패(!ok) → throw', async () => {
    mockFetch({ ok: false, status: 403 });
    await expect(transcribeAudioUrl('https://x/nope.m4a')).rejects.toThrow();
    expect(transcriptionsCreate).not.toHaveBeenCalled();
  });
});

describe('summarizeTranscriptWithQwen', () => {
  beforeEach(() => messagesCreate.mockReset());

  it('빈 전사 → throw, Qwen 호출 안 함', async () => {
    await expect(summarizeTranscriptWithQwen('   ')).rejects.toThrow();
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it('전사 → Qwen 요약 단일 호출(화자분리 별도호출 없음), {transcript, summary} 반환', async () => {
    messagesCreate.mockResolvedValueOnce(qwenText('[통화 개요]\n서윤 학생 상담\n\n[핵심 니즈]\n- 1600 목표'));
    const r = await summarizeTranscriptWithQwen('안녕하세요 상담입니다');
    expect(messagesCreate).toHaveBeenCalledTimes(1); // 화자분리 호출 제거 → 1회
    expect(r.transcript).toBe('안녕하세요 상담입니다'); // 원본 전사 그대로
    expect(r.summary).toContain('통화 개요');
  });

  it('요약이 비면 throw', async () => {
    messagesCreate.mockResolvedValueOnce(qwenText('   '));
    await expect(summarizeTranscriptWithQwen('x')).rejects.toThrow();
  });

  it('요약이 한국어→중국어로 드리프트하면 중국어 꼬리를 잘라 한국어만 남긴다 (회귀)', async () => {
    const drifted =
      '[핵심 니즈]\n- 1600 목표\n\n[다음 액션]\n- 진단 테스트 준비\n\n' +
      '[核心需求]\n- 希望为正在UAE就读A-Level课程的儿子准备SAT考试\n- 目标是达到1500分以上';
    messagesCreate.mockResolvedValueOnce(qwenText(drifted));
    const r = await summarizeTranscriptWithQwen('x');
    expect(r.summary).toContain('핵심 니즈');
    expect(r.summary).toContain('1600 목표');
    expect(r.summary).not.toContain('核心需求');
    expect(r.summary).not.toMatch(/[一-鿿]/); // 한자 없음
  });
});
