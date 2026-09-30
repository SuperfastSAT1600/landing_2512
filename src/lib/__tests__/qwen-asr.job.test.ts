/// <reference types="vitest/globals" />
import { submitAsrTask, checkAsrTask, AsrFailedError } from '@/lib/qwen-asr';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function res(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.QWEN_API_KEY = 'test-key';
});

describe('submitAsrTask (REQ-001)', () => {
  it('작업을 제출하고 task_id만 돌려준다 — 완료를 기다리지 않는다', async () => {
    fetchMock.mockResolvedValueOnce(res({ output: { task_id: 'task-1' } }));

    expect(await submitAsrTask('https://audio/x.mp3')).toBe('task-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({ 'X-DashScope-Async': 'enable' });
  });

  it('제출이 거절되면 AsrFailedError', async () => {
    fetchMock.mockResolvedValueOnce(res({}, false, 429));
    await expect(submitAsrTask('https://audio/x.mp3')).rejects.toBeInstanceOf(AsrFailedError);
  });
});

describe('checkAsrTask (REQ-001)', () => {
  it('진행 중이면 sleep 없이 running을 돌려준다', async () => {
    fetchMock.mockResolvedValueOnce(res({ output: { task_status: 'RUNNING' } }));

    expect(await checkAsrTask('task-1')).toEqual({ status: 'running' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('완료면 화자 라벨이 붙은 전사문을 돌려준다', async () => {
    fetchMock
      .mockResolvedValueOnce(
        res({
          output: {
            task_status: 'SUCCEEDED',
            results: [{ transcription_url: 'https://doc/1.json' }],
          },
        })
      )
      .mockResolvedValueOnce(
        res({
          transcripts: [
            {
              sentences: [
                { text: '안녕하세요', speaker_id: 0 },
                { text: '네 안녕하세요', speaker_id: 1 },
              ],
            },
          ],
        })
      );

    expect(await checkAsrTask('task-1')).toEqual({
      status: 'done',
      text: '화자1: 안녕하세요\n화자2: 네 안녕하세요',
    });
  });

  it('작업이 FAILED면 AsrFailedError', async () => {
    fetchMock.mockResolvedValueOnce(
      res({ output: { task_status: 'FAILED', message: 'bad audio' } })
    );
    await expect(checkAsrTask('task-1')).rejects.toBeInstanceOf(AsrFailedError);
  });
});
