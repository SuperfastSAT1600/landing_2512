import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

class AsrFailedError extends Error {
  constructor(message = '녹음 전사에 실패했습니다.') {
    super(message);
    this.name = 'AsrFailedError';
  }
}
class QuotaExhaustedError extends Error {
  constructor() {
    super('AI 크레딧이 소진되어 처리할 수 없습니다.');
    this.name = 'QuotaExhaustedError';
  }
}
class StudentNotFoundError extends Error {
  constructor() {
    super('Student not found');
    this.name = 'StudentNotFoundError';
  }
}

const submitAsrTask = vi.fn();
const checkAsrTask = vi.fn();
const summarizeTranscriptWithQwen = vi.fn();
const appendConsultationEntry = vi.fn();
const getPlaudFile = vi.fn();
const getAccountLabel = vi.fn();
const notifyMemoToSlack = vi.fn();
const insertCallTranscript = vi.fn();

vi.mock('@/lib/qwen-asr', () => ({ submitAsrTask, checkAsrTask, AsrFailedError, ASR_MODEL: 'fun-asr' }));
vi.mock('@/lib/plaud-transcribe', () => ({ summarizeTranscriptWithQwen, QuotaExhaustedError }));
vi.mock('@/lib/plaud-client', () => ({ getPlaudFile, getAccountLabel }));
vi.mock('@/lib/call-transcripts', () => ({ insertCallTranscript }));
vi.mock('@/lib/consultation-timeline', () => ({ appendConsultationEntry, StudentNotFoundError }));
vi.mock('@/lib/slack-memo', () => ({ notifyMemoToSlack, PLAUD_MEMO_HEADING: '🎙️ 상담 요약' }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const params = Promise.resolve({ id: 'stu-1' });

function req(method: 'POST' | 'PUT', body: Record<string, unknown>, key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/students/stu-1/plaud-memo/job', {
    method,
    headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getAccountLabel.mockReturnValue('이민재');
});

describe('POST /api/crm/students/[id]/plaud-memo/job — 제출 (REQ-002)', () => {
  it('인증 실패는 401', async () => {
    const { POST } = await import('../route');
    expect((await POST(req('POST', { file_id: 'f1', account_key: 'me' }, 'nope'), { params })).status).toBe(401);
  });

  it('전사 작업만 제출하고 task_id와 메타를 즉시 돌려준다', async () => {
    getPlaudFile.mockResolvedValueOnce({
      presigned_url: 'https://audio/x.mp3',
      name: '박윤빈 어머님_첫 세일즈콜',
      start_at: '2026-09-30T02:53:00',
      duration: 828000,
    });
    submitAsrTask.mockResolvedValueOnce('task-1');

    const { POST } = await import('../route');
    const res = await POST(req('POST', { file_id: 'f1', account_key: 'me' }), { params });

    expect(res.status).toBe(202);
    expect((await res.json()).data).toMatchObject({
      task_id: 'task-1',
      recording_name: '박윤빈 어머님_첫 세일즈콜',
      duration_sec: 828,
    });
    // 제출 단계에서는 요약·저장을 하지 않는다.
    expect(summarizeTranscriptWithQwen).not.toHaveBeenCalled();
    expect(appendConsultationEntry).not.toHaveBeenCalled();
  });

  it('account_key 없이 file_id만 오면 400', async () => {
    const { POST } = await import('../route');
    expect((await POST(req('POST', { file_id: 'f1' }), { params })).status).toBe(400);
  });

  it('제출이 거절되면 502로 원인을 그대로 전달한다', async () => {
    getPlaudFile.mockResolvedValueOnce({ presigned_url: 'https://audio/x.mp3', name: 'n' });
    submitAsrTask.mockRejectedValueOnce(new AsrFailedError('전사 요청이 거절됐습니다. (429)'));

    const { POST } = await import('../route');
    const res = await POST(req('POST', { file_id: 'f1', account_key: 'me' }), { params });

    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain('429');
  });
});

describe('PUT /api/crm/students/[id]/plaud-memo/job — 확인·마무리 (REQ-003)', () => {
  it('진행 중이면 running만 돌려주고 아무것도 저장하지 않는다', async () => {
    checkAsrTask.mockResolvedValueOnce({ status: 'running' });

    const { PUT } = await import('../route');
    const res = await PUT(req('PUT', { task_id: 'task-1' }), { params });

    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ status: 'running' });
    expect(appendConsultationEntry).not.toHaveBeenCalled();
    expect(insertCallTranscript).not.toHaveBeenCalled();
    expect(notifyMemoToSlack).not.toHaveBeenCalled();
  });

  it('완료면 요약해 미공개 초안으로 저장하고 전사·슬랙까지 마친다', async () => {
    checkAsrTask.mockResolvedValueOnce({ status: 'done', text: '화자1: 안녕하세요' });
    summarizeTranscriptWithQwen.mockResolvedValueOnce({
      transcript: '화자1: 안녕하세요',
      summary: '## 요약\n- 내용',
    });
    appendConsultationEntry.mockResolvedValueOnce({ id: 'entry-1' });

    const { PUT } = await import('../route');
    const res = await PUT(
      req('PUT', {
        task_id: 'task-1',
        account_key: 'me',
        file_id: 'f1',
        recording_name: '박윤빈 어머님_첫 세일즈콜',
        recorded_at: '2026-09-30T02:53:00',
        duration_sec: 828,
      }),
      { params }
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.status).toBe('done');
    expect(json.data.entry).toEqual({ id: 'entry-1' });

    expect(appendConsultationEntry).toHaveBeenCalledWith(
      'stu-1',
      expect.objectContaining({ published: false, author: '이민재' })
    );
    expect(insertCallTranscript).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 'stu-1', durationSec: 828, transcript: '화자1: 안녕하세요' })
    );
    expect(notifyMemoToSlack).toHaveBeenCalled();
  });

  it('전사 작업이 실패했으면 502', async () => {
    checkAsrTask.mockRejectedValueOnce(new AsrFailedError('전사에 실패했습니다. (bad audio)'));

    const { PUT } = await import('../route');
    const res = await PUT(req('PUT', { task_id: 'task-1' }), { params });

    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain('bad audio');
  });

  it('task_id가 없으면 400', async () => {
    const { PUT } = await import('../route');
    expect((await PUT(req('PUT', {}), { params })).status).toBe(400);
  });

  it('전사 원문 저장이 실패해도 메모는 살린다', async () => {
    checkAsrTask.mockResolvedValueOnce({ status: 'done', text: 't' });
    summarizeTranscriptWithQwen.mockResolvedValueOnce({ transcript: 't', summary: 's' });
    appendConsultationEntry.mockResolvedValueOnce({ id: 'entry-1' });
    insertCallTranscript.mockRejectedValueOnce(new Error('db down'));

    const { PUT } = await import('../route');
    const res = await PUT(req('PUT', { task_id: 'task-1' }), { params });

    expect(res.status).toBe(201);
  });
});
