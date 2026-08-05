import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

class StudentNotFoundError extends Error {
  constructor() {
    super('Student not found');
    this.name = 'StudentNotFoundError';
  }
}
class AudioTooLargeError extends Error {
  constructor() {
    super('녹음이 24MB를 초과해 전사할 수 없습니다.');
    this.name = 'AudioTooLargeError';
  }
}

const processPlaudRecording = vi.fn();
const appendConsultationEntry = vi.fn();
const getPlaudFile = vi.fn();

vi.mock('@/lib/plaud-process', () => ({ processPlaudRecording }));
vi.mock('@/lib/plaud-transcribe', () => ({ AudioTooLargeError }));
vi.mock('@/lib/plaud-client', () => ({ getPlaudFile }));
vi.mock('@/lib/consultation-timeline', () => ({
  appendConsultationEntry,
  StudentNotFoundError,
}));

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
  beforeEach(() => vi.clearAllMocks());

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
    const res = await POST(makeReq({ file_id: 'f1' }), { params });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(getPlaudFile).toHaveBeenCalledWith('f1');
    expect(processPlaudRecording).toHaveBeenCalledWith({ audioUrl: 'https://s3/audio.mp3?sig=1' });
    expect(body.data.entry).toEqual(entry);
    const [, arg] = appendConsultationEntry.mock.calls[0];
    expect(arg.raw_memo).toContain('우찬 상담');
    // start_at(UTC 2026-08-04T00:31:27) → KST 09:31 로 헤더에 표시
    expect(arg.raw_memo).toContain('2026-08-04 09:31');
    expect(arg.raw_memo).not.toContain('00:31'); // UTC 시각이 그대로 노출되지 않음
  });

  it('file_id인데 get_file 실패 → 502', async () => {
    getPlaudFile.mockRejectedValueOnce(new Error('mcp down'));
    const { POST } = await import('../route');
    const res = await POST(makeReq({ file_id: 'f1' }), { params });
    expect(res.status).toBe(502);
    expect(processPlaudRecording).not.toHaveBeenCalled();
  });

  it('24MB 초과(AudioTooLargeError) → 413', async () => {
    processPlaudRecording.mockRejectedValueOnce(new AudioTooLargeError());
    const { POST } = await import('../route');
    const res = await POST(makeReq({ audio_url: 'https://x/big.m4a' }), { params });
    expect(res.status).toBe(413);
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

  it('요약/전사 실패(일반 throw) → 500', async () => {
    processPlaudRecording.mockRejectedValueOnce(new Error('qwen down'));
    const { POST } = await import('../route');
    const res = await POST(makeReq({ audio_url: 'https://x/a.m4a' }), { params });
    expect(res.status).toBe(500);
    expect(appendConsultationEntry).not.toHaveBeenCalled();
  });
});
