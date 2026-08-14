import { renderHook, waitFor, act } from '@testing-library/react';
import { useWinbackPlays } from '../useWinbackPlays';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function jsonRes(data: unknown, ok = true) {
  return { ok, json: async () => (ok ? { data } : { error: (data as { error: string }).error }) };
}

describe('useWinbackPlays.deletePlay (REQ-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DELETE 성공 시 플레이 목록을 다시 불러온다', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonRes([{ id: 'p1' }])) // initial fetchPlays on mount
      .mockResolvedValueOnce(jsonRes({ id: 'p1' })) // DELETE
      .mockResolvedValueOnce(jsonRes([])); // refetch after delete

    const { result } = renderHook(() => useWinbackPlays('admin-key'));
    await waitFor(() => expect(result.current.plays).toHaveLength(1));

    await act(() => result.current.deletePlay('p1'));

    await waitFor(() => expect(result.current.plays).toHaveLength(0));
    const deleteCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE');
    expect(deleteCall?.[0]).toBe('/api/crm/winback-plays/p1');
  });

  it('DELETE 실패 시 에러 메시지를 throw한다', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonRes([]))
      .mockResolvedValueOnce(jsonRes({ error: '삭제에 실패했습니다: db error' }, false));

    const { result } = renderHook(() => useWinbackPlays('admin-key'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.deletePlay('p1')).rejects.toThrow('삭제에 실패했습니다: db error');
  });
});
