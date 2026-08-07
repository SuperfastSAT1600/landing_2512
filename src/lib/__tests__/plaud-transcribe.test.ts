import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// OpenAI STT + Qwen SDK를 모킹해 네트워크·키 없이 검증한다.
const { transcriptionsCreate, messagesCreate, isMp3Mock, chunkMock } = vi.hoisted(() => ({
  transcriptionsCreate: vi.fn(),
  messagesCreate: vi.fn(),
  isMp3Mock: vi.fn(),
  chunkMock: vi.fn(),
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
// MP3 청커는 mock해 청크 분할을 테스트에서 제어(실제 >24MB 버퍼 생성 불필요).
vi.mock('@/lib/mp3-chunk', () => ({
  isMp3: (b: Buffer) => isMp3Mock(b),
  chunkMp3ByFrames: (b: Buffer, t?: number) => chunkMock(b, t),
}));

import { toFile } from 'openai';
import {
  transcribeAudioUrl,
  summarizeTranscriptWithQwen,
  AudioTooLargeError,
  AudioTooLongError,
  MAX_AUDIO_BYTES,
  MAX_CHUNKS,
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
    isMp3Mock.mockReset();
    chunkMock.mockReset();
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

  it('24MB 초과 & 非MP3(m4a 등) → AudioTooLargeError, STT 호출 안 함', async () => {
    mockFetch({ ok: true, bytes: MAX_AUDIO_BYTES + 1 });
    isMp3Mock.mockReturnValue(false); // m4a/wav 등은 바이트 분할 불가
    await expect(transcribeAudioUrl('https://x/big.m4a')).rejects.toBeInstanceOf(AudioTooLargeError);
    expect(transcriptionsCreate).not.toHaveBeenCalled();
  });

  it('24MB 초과 MP3 → 청크별 STT 후 순서대로 이어붙여 반환', async () => {
    mockFetch({ ok: true, bytes: MAX_AUDIO_BYTES + 1, contentType: 'binary/octet-stream' });
    isMp3Mock.mockReturnValue(true);
    chunkMock.mockReturnValue([Buffer.from('c1'), Buffer.from('c2'), Buffer.from('c3')]);
    transcriptionsCreate
      .mockResolvedValueOnce({ text: 'A' })
      .mockResolvedValueOnce({ text: 'B' })
      .mockResolvedValueOnce({ text: 'C' });
    const out = await transcribeAudioUrl('https://s3/audiofiles/big.mp3?X-Amz=1');
    expect(transcriptionsCreate).toHaveBeenCalledTimes(3);
    expect(out).toBe('A\nB\nC'); // 완료 순서와 무관하게 청크 index 순서 보존
  });

  it('청크 수가 MAX_CHUNKS 초과 → AudioTooLongError, STT 호출 안 함', async () => {
    mockFetch({ ok: true, bytes: MAX_AUDIO_BYTES + 1, contentType: 'binary/octet-stream' });
    isMp3Mock.mockReturnValue(true);
    chunkMock.mockReturnValue(Array.from({ length: MAX_CHUNKS + 1 }, (_, i) => Buffer.from(`c${i}`)));
    await expect(transcribeAudioUrl('https://s3/audiofiles/toolong.mp3')).rejects.toBeInstanceOf(
      AudioTooLongError,
    );
    expect(transcriptionsCreate).not.toHaveBeenCalled();
  });

  it('AudioTooLongError는 AudioTooLargeError의 하위(라우트 413 매핑 재사용)', () => {
    expect(new AudioTooLongError()).toBeInstanceOf(AudioTooLargeError);
  });

  it('24MB 초과 MP3인데 청커가 throw → AudioTooLargeError로 폴백', async () => {
    mockFetch({ ok: true, bytes: MAX_AUDIO_BYTES + 1, contentType: 'binary/octet-stream' });
    isMp3Mock.mockReturnValue(true);
    chunkMock.mockImplementation(() => {
      throw new Error('오싱크');
    });
    await expect(transcribeAudioUrl('https://s3/audiofiles/weird.mp3')).rejects.toBeInstanceOf(
      AudioTooLargeError,
    );
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
