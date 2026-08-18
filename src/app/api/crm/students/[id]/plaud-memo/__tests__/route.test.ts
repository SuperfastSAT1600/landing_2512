import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

class StudentNotFoundError extends Error {
  constructor() {
    super('Student not found');
    this.name = 'StudentNotFoundError';
  }
}
class AsrFailedError extends Error {
  constructor(message = '녹음 전사에 실패했습니다.') {
    super(message);
    this.name = 'AsrFailedError';
  }
}
class AsrTimeoutError extends AsrFailedError {
  constructor() {
    super('전사가 시간 안에 끝나지 않았습니다. 잠시 후 다시 시도해주세요.');
    this.name = 'AsrTimeoutError';
  }
}
class QuotaExhaustedError extends Error {
  constructor() {
    super('AI 크레딧이 소진되어 처리할 수 없습니다. 결제(크레딧)를 확인해주세요.');
    this.name = 'QuotaExhaustedError';
  }
}

const processPlaudRecording = vi.fn();
const appendConsultationEntry = vi.fn();
const getPlaudFile = vi.fn();
const getAccountLabel = vi.fn();
const notifyMemoToSlack = vi.fn();

vi.mock('@/lib/plaud-process', () => ({ processPlaudRecording }));
vi.mock('@/lib/plaud-transcribe', () => ({ QuotaExhaustedError }));
vi.mock('@/lib/qwen-asr', () => ({ AsrFailedError, AsrTimeoutError }));
vi.mock('@/lib/plaud-client', () => ({ getPlaudFile, getAccountLabel }));
vi.mock('@/lib/slack-memo', () => ({
  notifyMemoToSlack,
  PLAUD_MEMO_HEADING: '🎙️ *Plaud 녹음 상담 메모*',
}));
vi.mock('@/lib/consultation-timeline', () => ({
  appendConsultationEntry,
  StudentNotFoundError,
}));

const LABELS: Record<string, string> = { me: '이민재', wooyoung: '김우영' };

process.env.ADMIN_SECRET_KEY = 'admin-key';

function makeReq(body: unknown, key: string | null = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/students/s1/plaud-memo', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(key ? { 'x-admin-key': key } : {}),
    },
    body: JSON.stringify(body),
  });
}
const params = Promise.resolve({ id: 's1' });

describe('POST /api/crm/students/[id]/plaud-memo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccountLabel.mockImplementation((k: string) => LABELS[k]);
    notifyMemoToSlack.mockResolvedValue(undefined);
  });

  it('잘못된 admin key → 401', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ audio_url: 'https://x/a.m4a' }, 'nope'), { params });
    expect(res.status).toBe(401);
    expect(processPlaudRecording).not.toHaveBeenCalled();
  });

  it('file_id·audio_url 둘 다 없음 → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({}), { params });
    expect(res.status).toBe(400);
    expect(processPlaudRecording).not.toHaveBeenCalled();
  });

  it('file_id 제공 → get_file로 URL 해석 후 201, 헤더에 녹음명 포함', async () => {
    getPlaudFile.mockResolvedValueOnce({
      id: 'f1',
      name: '우찬 상담',
      start_at: '2026-08-04T00:31:27',
      presigned_url: 'https://s3/audio.mp3?sig=1',
    });
    processPlaudRecording.mockResolvedValueOnce({ transcript: 't', summary: '[핵심 니즈]\n- 1600' });
    const entry = { id: 'e2', published: false };
    appendConsultationEntry.mockResolvedValueOnce(entry);

    const { POST } = await import('../route');
    const res = await POST(makeReq({ file_id: 'f1', account_key: 'me' }), { params });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(getPlaudFile).toHaveBeenCalledWith('f1', 'me');
    expect(processPlaudRecording).toHaveBeenCalledWith({ audioUrl: 'https://s3/audio.mp3?sig=1' });
    expect(body.data.entry).toEqual(entry);
    const [, arg] = appendConsultationEntry.mock.calls[0];
    expect(arg.raw_memo).toContain('우찬 상담');
    // start_at(UTC 2026-08-04T00:31:27) → KST 09:31 로 헤더에 표시
    expect(arg.raw_memo).toContain('2026-08-04 09:31');
    expect(arg.raw_memo).not.toContain('00:31'); // UTC 시각이 그대로 노출되지 않음
  });

  it('REQ-005: file_id + account_key → getPlaudFile에 계정 전달, author를 라벨로 기록', async () => {
    getPlaudFile.mockResolvedValueOnce({
      id: 'w1',
      name: '우영 상담',
      start_at: '2026-08-04T01:00:00',
      presigned_url: 'https://s3/wy.mp3?sig=1',
    });
    processPlaudRecording.mockResolvedValueOnce({ transcript: 't', summary: '요약' });
    appendConsultationEntry.mockResolvedValueOnce({ id: 'e3', published: false });

    const { POST } = await import('../route');
    const res = await POST(makeReq({ file_id: 'w1', account_key: 'wooyoung' }), { params });

    expect(res.status).toBe(201);
    expect(getPlaudFile).toHaveBeenCalledWith('w1', 'wooyoung');
    const [, arg] = appendConsultationEntry.mock.calls[0];
    expect(arg.author).toBe('김우영'); // 상담자 태그 기록
    expect(arg.published).toBe(false);
  });

  it('REQ-005: file_id인데 account_key 누락 → 400 (녹음 처리 안 함)', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ file_id: 'f1' }), { params });
    expect(res.status).toBe(400);
    expect(getPlaudFile).not.toHaveBeenCalled();
    expect(processPlaudRecording).not.toHaveBeenCalled();
  });

  it('file_id인데 get_file 실패 → 502', async () => {
    getPlaudFile.mockRejectedValueOnce(new Error('mcp down'));
    const { POST } = await import('../route');
    const res = await POST(makeReq({ file_id: 'f1', account_key: 'me' }), { params });
    expect(res.status).toBe(502);
    expect(processPlaudRecording).not.toHaveBeenCalled();
  });

  it('전사 실패(AsrFailedError) → 502 + 원인 메시지', async () => {
    processPlaudRecording.mockRejectedValueOnce(new AsrFailedError());
    const { POST } = await import('../route');
    const res = await POST(makeReq({ audio_url: 'https://x/a.mp3' }), { params });
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body.error).toContain('전사');
    expect(appendConsultationEntry).not.toHaveBeenCalled();
  });

  it('전사 타임아웃(AsrTimeoutError) → 502 + 재시도 안내', async () => {
    processPlaudRecording.mockRejectedValueOnce(new AsrTimeoutError());
    const { POST } = await import('../route');
    const res = await POST(makeReq({ audio_url: 'https://x/long.mp3' }), { params });
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body.error).toContain('다시 시도');
    expect(appendConsultationEntry).not.toHaveBeenCalled();
  });

  it('없는 학생 → 404', async () => {
    processPlaudRecording.mockResolvedValueOnce({ transcript: 't', summary: '요약' });
    appendConsultationEntry.mockRejectedValueOnce(new StudentNotFoundError());
    const { POST } = await import('../route');
    const res = await POST(makeReq({ audio_url: 'https://x/a.m4a' }), { params });
    expect(res.status).toBe(404);
  });

  it('정상 → 201, published:false·🎙️ 헤더 포함 메모로 append', async () => {
    processPlaudRecording.mockResolvedValueOnce({ transcript: 't', summary: '[핵심 니즈]\n- 1600' });
    const entry = { id: 'e1', published: false };
    appendConsultationEntry.mockResolvedValueOnce(entry);

    const { POST } = await import('../route');
    const res = await POST(
      makeReq({ audio_url: 'https://x/a.m4a', recording_name: '홍길동 상담', recorded_at: '2026-08-04' }),
      { params },
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.entry).toEqual(entry);
    expect(body.data.summary).toContain('핵심 니즈');
    expect(processPlaudRecording).toHaveBeenCalledWith({ audioUrl: 'https://x/a.m4a' });

    const [studentId, arg] = appendConsultationEntry.mock.calls[0];
    expect(studentId).toBe('s1');
    expect(arg.published).toBe(false);
    expect(arg.raw_memo).toContain('🎙️ Plaud 상담 자동 요약');
    expect(arg.raw_memo).toContain('핵심 니즈');
    expect(arg.raw_memo).toContain('홍길동 상담');
  });

  it('크레딧 소진(QuotaExhaustedError) → 402 + 원인 알려주는 메시지', async () => {
    processPlaudRecording.mockRejectedValueOnce(new QuotaExhaustedError());
    const { POST } = await import('../route');
    const res = await POST(makeReq({ audio_url: 'https://x/a.mp3' }), { params });
    const body = await res.json();
    expect(res.status).toBe(402);
    expect(body.error).toContain('크레딧');
    expect(appendConsultationEntry).not.toHaveBeenCalled();
  });

  it('메모 생성 성공 → 슬랙 알림 전송(녹음명·상담인·요약 포함)', async () => {
    getPlaudFile.mockResolvedValueOnce({
      id: 'w1',
      name: '우영 상담',
      start_at: '2026-08-04T01:00:00',
      presigned_url: 'https://s3/wy.mp3?sig=1',
    });
    processPlaudRecording.mockResolvedValueOnce({ transcript: 't', summary: '[핵심 니즈]\n- 1600 목표' });
    appendConsultationEntry.mockResolvedValueOnce({ id: 'e4', published: false });

    const { POST } = await import('../route');
    const res = await POST(makeReq({ file_id: 'w1', account_key: 'wooyoung' }), { params });

    expect(res.status).toBe(201);
    expect(notifyMemoToSlack).toHaveBeenCalledTimes(1);
    const arg = notifyMemoToSlack.mock.calls[0][0];
    expect(arg.studentId).toBe('s1');
    expect(arg.author).toBe('김우영');
    expect(arg.heading).toContain('Plaud');
    expect(arg.memo).toContain('1600 목표');
    expect(arg.memo).toContain('우영 상담');
    expect(arg.memo).toContain('2026-08-04 10:00'); // KST 변환된 녹음 시각
  });

  it('슬랙 전송이 실패해도 메모 생성은 201', async () => {
    processPlaudRecording.mockResolvedValueOnce({ transcript: 't', summary: '요약' });
    appendConsultationEntry.mockResolvedValueOnce({ id: 'e5', published: false });
    notifyMemoToSlack.mockRejectedValueOnce(new Error('slack down'));

    const { POST } = await import('../route');
    const res = await POST(makeReq({ audio_url: 'https://x/a.m4a' }), { params });

    expect(res.status).toBe(201);
  });

  it('메모 생성 실패 시 슬랙 알림 없음', async () => {
    processPlaudRecording.mockRejectedValueOnce(new Error('qwen down'));
    const { POST } = await import('../route');
    await POST(makeReq({ audio_url: 'https://x/a.m4a' }), { params });
    expect(notifyMemoToSlack).not.toHaveBeenCalled();
  });

  it('요약/전사 실패(일반 throw) → 500', async () => {
    processPlaudRecording.mockRejectedValueOnce(new Error('qwen down'));
    const { POST } = await import('../route');
    const res = await POST(makeReq({ audio_url: 'https://x/a.m4a' }), { params });
    expect(res.status).toBe(500);
    expect(appendConsultationEntry).not.toHaveBeenCalled();
  });
});
