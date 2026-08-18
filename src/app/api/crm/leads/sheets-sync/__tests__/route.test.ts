import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Supabase Admin Mock ──────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    })),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

process.env.SHEETS_SYNC_SECRET = 'test-secret-key';

function makeRequest(body: unknown, key = 'test-secret-key') {
  return new NextRequest('http://localhost/api/crm/leads/sheets-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sync-key': key,
    },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  source_tab: 'META리드_인스턴트폼',
  created_time: '2026-02-14T00:56:00',
  ad_name: '23)26여름방학특강_2',
  platform: 'ig',
  phone: '+821099552737',
  grade: '고2',
  target_score_text: '1500',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/crm/leads/sheets-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // REQ-001: 인증

  it('잘못된 x-sync-key → 401', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(validPayload, 'wrong-key'));
    expect(res.status).toBe(401);
  });

  it('x-sync-key 헤더 없음 → 401', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost/api/crm/leads/sheets-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('필수 필드 누락 (phone 없음) → 400', async () => {
    const { POST } = await import('../route');
    const { phone: _p, ...noPhone } = validPayload;
    const res = await POST(makeRequest(noPhone));
    expect(res.status).toBe(400);
  });

  it('필수 필드 누락 (source_tab 없음) → 400', async () => {
    const { POST } = await import('../route');
    const { source_tab: _s, ...noTab } = validPayload;
    const res = await POST(makeRequest(noTab));
    expect(res.status).toBe(400);
  });

  // REQ-003: 신규 생성

  it('신규 번호 → 201 + action: created', async () => {
    // 1차 조회 → 중복 없음 (parent_phone eq 체크)
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ data: [], error: null }),
    });
    // 2차 조회 → META 리드 순번 카운트 (count: 5 → 신규는 META리드_6)
    mockSelect.mockReturnValueOnce({
      contains: vi.fn().mockResolvedValueOnce({ count: 5, error: null }),
    });
    // insert → 성공
    mockInsert.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        single: vi.fn().mockResolvedValueOnce({
          data: { id: 'abc-123', name: 'META리드_6' },
          error: null,
        }),
      }),
    });

    const { POST } = await import('../route');
    const res = await POST(makeRequest(validPayload));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.action).toBe('created');
    expect(body.student_id).toBe('abc-123');
  });

  // REQ-003: 중복 병합

  it('기존 번호 → 200 + action: merged, campaign_tags 업데이트', async () => {
    const existingStudent = {
      id: 'existing-id',
      campaign_tags: ['기존 태그'],
    };

    // 조회 → 기존 학생 있음
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ data: [existingStudent], error: null }),
    });

    // update → 성공
    const mockUpdateReturn = {
      eq: vi.fn().mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: { id: 'existing-id' },
            error: null,
          }),
        }),
      }),
    };
    mockUpdate.mockReturnValueOnce(mockUpdateReturn);

    const { POST } = await import('../route');
    const res = await POST(makeRequest(validPayload));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.action).toBe('merged');
    expect(body.student_id).toBe('existing-id');

    // campaign_tags 병합 확인
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.campaign_tags).toContain('기존 태그');
    expect(updateCall.campaign_tags).toContain('META 리드');
  });

  it('DB 오류 → 500', async () => {
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ data: null, error: new Error('DB error') }),
    });

    const { POST } = await import('../route');
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(500);
  });
});
