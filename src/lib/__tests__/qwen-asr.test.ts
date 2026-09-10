import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  transcribeAudioUrlWithQwen,
  AsrFailedError,
  AsrTimeoutError,
} from '@/lib/qwen-asr';

/** DashScope 3단계(제출 → 폴링 → 결과문서)를 순서대로 흉내내는 fetch 스텁. */
function stubFetch(steps: Array<{ ok?: boolean; status?: number; json?: unknown; text?: string }>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let i = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      const s = steps[Math.min(i++, steps.length - 1)];
      return {
        ok: s.ok ?? true,
        status: s.status ?? 200,
        json: async () => s.json,
        text: async () => s.text ?? JSON.stringify(s.json),
      };
    })
  );
  return calls;
}

const submitOk = { json: { output: { task_id: 'task-1', task_status: 'PENDING' } } };
const pollDone = (results: unknown[]) => ({
  json: { output: { task_status: 'SUCCEEDED', results } },
});
const docWithSpeakers = {
  json: {
    transcripts: [
      {
        text: '평문 전사',
        sentences: [
          { text: '네 여보세요.', speaker_id: 0 },
          { text: '어머님 안녕하세요.', speaker_id: 1 },
          { text: '진단 결과 말씀드릴게요.', speaker_id: 1 },
          { text: '네 감사합니다.', speaker_id: 0 },
        ],
      },
    ],
  },
};

// 폴링 대기를 즉시 진행시켜 테스트가 실시간으로 기다리지 않게 한다.
const noSleep = (_ms: number) => Promise.resolve();

describe('transcribeAudioUrlWithQwen', () => {
  beforeEach(() => {
    process.env.QWEN_API_KEY = 'test-key';
  });
  afterEach(() => vi.unstubAllGlobals());

  it('제출 → 폴링 → 결과문서 3단계를 거쳐 전사 텍스트를 반환', async () => {
    const calls = stubFetch([
      submitOk,
      pollDone([{ transcription_url: 'https://x/doc.json', subtask_status: 'SUCCEEDED' }]),
      docWithSpeakers,
    ]);

    const out = await transcribeAudioUrlWithQwen('https://s3/a.mp3', { sleep: noSleep });

    expect(calls).toHaveLength(3);
    expect(calls[0].url).toContain('/services/audio/asr/transcription');
    expect(calls[1].url).toContain('/tasks/task-1');
    expect(calls[2].url).toBe('https://x/doc.json');
    expect(out).toContain('여보세요');
  });

  it('비동기 헤더·오디오 URL·모델을 제출 요청에 담는다', async () => {
    const calls = stubFetch([
      submitOk,
      pollDone([{ transcription_url: 'https://x/doc.json' }]),
      docWithSpeakers,
    ]);

    await transcribeAudioUrlWithQwen('https://s3/a.mp3', { sleep: noSleep });

    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers['X-DashScope-Async']).toBe('enable');
    expect(headers.Authorization).toBe('Bearer test-key');
    const body = JSON.parse(calls[0].init?.body as string);
    expect(body.input.file_urls).toEqual(['https://s3/a.mp3']);
    expect(body.model).toBe('fun-asr');
    expect(body.parameters.diarization_enabled).toBe(true);
  });

  it('화자분리 결과는 연속 발화를 병합해 화자 라벨을 붙인다', async () => {
    stubFetch([submitOk, pollDone([{ transcription_url: 'https://x/doc.json' }]), docWithSpeakers]);

    const out = await transcribeAudioUrlWithQwen('https://s3/a.mp3', { sleep: noSleep });

    // 화자1(0) → 화자2(1, 연속 2문장 병합) → 화자1(0) = 3줄
    expect(out.split('\n')).toEqual([
      '화자1: 네 여보세요.',
      '화자2: 어머님 안녕하세요. 진단 결과 말씀드릴게요.',
      '화자1: 네 감사합니다.',
    ]);
  });

  it('화자 정보가 없으면 평문 전사로 폴백', async () => {
    stubFetch([
      submitOk,
      pollDone([{ transcription_url: 'https://x/doc.json' }]),
      { json: { transcripts: [{ text: '  화자 없는 전사  ' }] } },
    ]);

    await expect(transcribeAudioUrlWithQwen('https://s3/a.mp3', { sleep: noSleep })).resolves.toBe(
      '화자 없는 전사'
    );
  });

  it('PENDING/RUNNING 동안 계속 폴링한다', async () => {
    const calls = stubFetch([
      submitOk,
      { json: { output: { task_status: 'PENDING' } } },
      { json: { output: { task_status: 'RUNNING' } } },
      pollDone([{ transcription_url: 'https://x/doc.json' }]),
      docWithSpeakers,
    ]);

    await transcribeAudioUrlWithQwen('https://s3/a.mp3', { sleep: noSleep });

    expect(calls).toHaveLength(5); // 제출 + 폴링3 + 결과문서
  });

  it('제출 실패(non-2xx) → AsrFailedError', async () => {
    stubFetch([{ ok: false, status: 400, text: '{"code":"InvalidParameter"}' }]);
    await expect(
      transcribeAudioUrlWithQwen('https://s3/a.mp3', { sleep: noSleep })
    ).rejects.toBeInstanceOf(AsrFailedError);
  });

  it('작업 FAILED → AsrFailedError', async () => {
    stubFetch([
      submitOk,
      { json: { output: { task_status: 'FAILED', message: 'url error' } } },
    ]);
    await expect(
      transcribeAudioUrlWithQwen('https://s3/a.mp3', { sleep: noSleep })
    ).rejects.toBeInstanceOf(AsrFailedError);
  });

  it('폴링 상한 초과 → AsrTimeoutError', async () => {
    stubFetch([submitOk, { json: { output: { task_status: 'RUNNING' } } }]);
    await expect(
      transcribeAudioUrlWithQwen('https://s3/a.mp3', { sleep: noSleep, maxPolls: 3 })
    ).rejects.toBeInstanceOf(AsrTimeoutError);
  });

  it('전사 결과가 비면 AsrFailedError', async () => {
    stubFetch([
      submitOk,
      pollDone([{ transcription_url: 'https://x/doc.json' }]),
      { json: { transcripts: [{ text: '   ', sentences: [] }] } },
    ]);
    await expect(
      transcribeAudioUrlWithQwen('https://s3/a.mp3', { sleep: noSleep })
    ).rejects.toBeInstanceOf(AsrFailedError);
  });

  it('QWEN_API_KEY 미설정 → throw, 요청 안 함', async () => {
    delete process.env.QWEN_API_KEY;
    const calls = stubFetch([submitOk]);
    await expect(transcribeAudioUrlWithQwen('https://s3/a.mp3', { sleep: noSleep })).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
});
