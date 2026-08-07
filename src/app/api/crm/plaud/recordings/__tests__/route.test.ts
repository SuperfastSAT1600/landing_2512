import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const listPlaudRecordings = vi.fn();
const listPlaudAccountKeys = vi.fn();
const getAccountLabel = vi.fn();
vi.mock('@/lib/plaud-client', () => ({
  listPlaudRecordings,
  listPlaudAccountKeys,
  getAccountLabel,
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

function makeReq(url: string, key: string | null = 'admin-key') {
  return new NextRequest(url, { headers: key ? { 'x-admin-key': key } : {} });
}

const LABELS: Record<string, string> = { me: '이민재', wooyoung: '김우영' };

describe('GET /api/crm/plaud/recordings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본: 두 계정 활성, 라벨은 로스터에서.
    listPlaudAccountKeys.mockReturnValue(['me', 'wooyoung']);
    getAccountLabel.mockImplementation((k: string) => LABELS[k]);
  });

  it('잘못된 admin key → 401', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeReq('http://localhost/api/crm/plaud/recordings', 'nope'));
    expect(res.status).toBe(401);
    expect(listPlaudRecordings).not.toHaveBeenCalled();
  });

  it('REQ-004: account_key 없으면 두 계정 목록을 병합·시간순 정렬하고 owner_label 태깅', async () => {
    listPlaudRecordings
      .mockResolvedValueOnce([
        { id: 'm1', name: '내상담A', start_at: '2026-08-05T02:00:00' },
        { id: 'm2', name: '내상담B', start_at: '2026-08-03T09:00:00' },
      ]) // me
      .mockResolvedValueOnce([
        { id: 'w1', name: '우영상담', start_at: '2026-08-04T10:00:00' },
      ]); // wooyoung
    const { GET } = await import('../route');
    const res = await GET(makeReq('http://localhost/api/crm/plaud/recordings'));
    const body = await res.json();

    expect(res.status).toBe(200);
    // 내림차순: m1(08-05) > w1(08-04) > m2(08-03)
    expect(body.data.map((r: { id: string }) => r.id)).toEqual(['m1', 'w1', 'm2']);
    // 계정별 태깅
    expect(body.data[0]).toMatchObject({ account_key: 'me', owner_label: '이민재' });
    expect(body.data[1]).toMatchObject({ account_key: 'wooyoung', owner_label: '김우영' });
    // 각 계정에 accountKey 인자 전달
    expect(listPlaudRecordings).toHaveBeenCalledWith(expect.any(Object), 'me');
    expect(listPlaudRecordings).toHaveBeenCalledWith(expect.any(Object), 'wooyoung');
  });

  it('REQ-006: account_key가 오면 해당 직원 계정만 조회(로스터 순회 안 함)', async () => {
    listPlaudRecordings.mockResolvedValueOnce([
      { id: 'w1', name: '우영상담', start_at: '2026-08-04T10:00:00' },
    ]);
    const { GET } = await import('../route');
    const res = await GET(
      makeReq('http://localhost/api/crm/plaud/recordings?account_key=wooyoung')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.map((r: { id: string }) => r.id)).toEqual(['w1']);
    expect(body.data[0]).toMatchObject({ account_key: 'wooyoung', owner_label: '김우영' });
    // 선택 계정에만 조회, 로스터 전체 순회는 안 함.
    expect(listPlaudRecordings).toHaveBeenCalledTimes(1);
    expect(listPlaudRecordings).toHaveBeenCalledWith(expect.any(Object), 'wooyoung');
    expect(listPlaudAccountKeys).not.toHaveBeenCalled();
  });

  it('REQ-004: 한 계정 실패해도 나머지 계정 결과는 반환(부분 실패 격리)', async () => {
    listPlaudRecordings
      .mockResolvedValueOnce([{ id: 'm1', name: '내상담', start_at: '2026-08-05T02:00:00' }]) // me ok
      .mockRejectedValueOnce(new Error('Plaud 토큰 갱신 실패: 401')); // byungyun fail
    const { GET } = await import('../route');
    const res = await GET(makeReq('http://localhost/api/crm/plaud/recordings'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.map((r: { id: string }) => r.id)).toEqual(['m1']);
  });

  it('REQ-004: 모든 계정 실패 → 502, 실제 원인 노출', async () => {
    listPlaudAccountKeys.mockReturnValue(['me']);
    listPlaudRecordings.mockRejectedValueOnce(new Error('Plaud 토큰 갱신 실패: 401'));
    const { GET } = await import('../route');
    const res = await GET(makeReq('http://localhost/api/crm/plaud/recordings'));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toContain('Plaud 토큰 갱신 실패: 401');
  });

  it('query/페이지 파라미터를 모든 계정에 전달', async () => {
    listPlaudRecordings.mockResolvedValue([]);
    const { GET } = await import('../route');
    await GET(
      makeReq('http://localhost/api/crm/plaud/recordings?q=%EC%83%81%EB%8B%B4&page_size=15')
    );
    expect(listPlaudRecordings).toHaveBeenCalledWith(
      expect.objectContaining({ query: '상담', page_size: 15 }),
      'me'
    );
  });
});
