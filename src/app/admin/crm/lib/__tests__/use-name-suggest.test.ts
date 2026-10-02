import { renderHook, act } from '@testing-library/react';
import { useNameSuggest } from '../use-name-suggest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function reply(rows: { id: string; name: string }[]) {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: rows }) });
}

describe('useNameSuggest', () => {
  // REQ-007 (crm-quality-cleanup): StudentCreateModal·StudentInfoEdit 공용
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('300ms 디바운스 후 이름 목록을 채우고, excludeId는 뺀다', async () => {
    reply([{ id: 's1', name: '김민수' }, { id: 's2', name: '김민수2' }]);
    const { result } = renderHook(() => useNameSuggest('key', 's1'));

    act(() => result.current.search('김민'));
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/crm/students?name_search=%EA%B9%80%EB%AF%BC',
      { headers: { 'x-admin-key': 'key' } }
    );
    expect(result.current.suggestions).toEqual(['김민수2']);
  });

  it('2글자 미만이면 요청 없이 비운다', async () => {
    const { result } = renderHook(() => useNameSuggest('key'));
    act(() => result.current.search('김'));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.suggestions).toEqual([]);
  });

  it('연속 입력은 마지막 값만 요청한다', async () => {
    reply([{ id: 's3', name: '박지훈' }]);
    const { result } = renderHook(() => useNameSuggest('key'));
    act(() => result.current.search('박지'));
    act(() => result.current.search('박지훈'));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.suggestions).toEqual(['박지훈']);
  });

  it('clear는 목록을 비운다', async () => {
    reply([{ id: 's3', name: '박지훈' }]);
    const { result } = renderHook(() => useNameSuggest('key'));
    act(() => result.current.search('박지'));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    act(() => result.current.clear());
    expect(result.current.suggestions).toEqual([]);
  });

  it('adminKey가 비어 있으면 요청하지 않는다', async () => {
    const { result } = renderHook(() => useNameSuggest(''));
    act(() => result.current.search('김민수'));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('언마운트하면 대기 중인 요청을 취소한다', async () => {
    const { result, unmount } = renderHook(() => useNameSuggest('key'));
    act(() => result.current.search('김민수'));
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
