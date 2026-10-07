import { renderHook, waitFor } from '@testing-library/react';
import { usePanelData } from '../usePanelData';
import type { Student } from '@/types/crm';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const student = {
  id: 'stu-1',
  name: 'META리드_165',
  consultation_timeline: [],
} as unknown as Student;

describe('usePanelData — 사라진 학생 처리 (REQ-003)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('상세 GET이 404면 onMissing을 호출한다', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Student not found' }),
    });
    const onMissing = vi.fn();

    renderHook(() => usePanelData('stu-1', 'admin-key', student, onMissing));

    await waitFor(() => expect(onMissing).toHaveBeenCalledTimes(1));
  });

  it('정상 응답이면 onMissing을 호출하지 않고 최신 데이터를 반영한다', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { ...student, name: '잠재고객_260930_01' } }),
    });
    const onMissing = vi.fn();

    const { result } = renderHook(() =>
      usePanelData('stu-1', 'admin-key', student, onMissing)
    );

    await waitFor(() => expect(result.current.localStudent.name).toBe('잠재고객_260930_01'));
    expect(onMissing).not.toHaveBeenCalled();
  });

  it('네트워크 오류로는 패널을 닫지 않는다', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const onMissing = vi.fn();

    const { result } = renderHook(() =>
      usePanelData('stu-1', 'admin-key', student, onMissing)
    );

    await waitFor(() => expect(result.current.loadingFresh).toBe(false));
    expect(onMissing).not.toHaveBeenCalled();
  });
});
