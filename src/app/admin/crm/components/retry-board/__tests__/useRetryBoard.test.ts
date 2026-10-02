import { act, renderHook, waitFor } from '@testing-library/react';
import type { DragEndEvent } from '@dnd-kit/core';
import { useRetryBoard } from '../useRetryBoard';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const STRATEGIES = [{ id: 'st-1', name: '전략1', category_id: 'c1', description: null }];
const CATEGORIES = [{ id: 'c1', name: 'A', sort_order: 1 }];
const STUDENTS = [
  { id: 's-1', name: '최연락', retry_stage: '연락 시도', retry_assigned_at: null },
  { id: 's-2', name: '정상담', retry_stage: '상담 중', retry_assigned_at: null },
];

const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => ({ data }) });

function baseRoute(patch: () => unknown = () => ok({})) {
  return async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (init?.method === 'PATCH') return patch();
    if (u.startsWith('/api/crm/retry-strategies?')) return ok(STRATEGIES);
    if (u.startsWith('/api/crm/strategy-categories')) return ok(CATEGORIES);
    if (u.startsWith('/api/crm/students?retry_strategy_id=')) return ok(STUDENTS);
    return ok([]);
  };
}

function dragEvent(activeId: string, overId: string | null): DragEndEvent {
  return { active: { id: activeId }, over: overId ? { id: overId } : null } as unknown as DragEndEvent;
}

async function loadedBoard(onStudentUpdate = vi.fn()) {
  const hook = renderHook(() => useRetryBoard({ adminKey: 'k', onStudentUpdate }));
  await waitFor(() => expect(hook.result.current.strategies).toHaveLength(1));
  act(() => hook.result.current.setSelectedId('st-1'));
  await waitFor(() => expect(hook.result.current.studentsByStage.get('연락 시도')).toHaveLength(1));
  return { ...hook, onStudentUpdate };
}

const stageOf = (r: { current: ReturnType<typeof useRetryBoard> }, id: string) =>
  [...r.current.studentsByStage.entries()].find(([, list]) => list.some((s) => s.id === id))?.[0];

describe('useRetryBoard', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('전략·카테고리를 불러와 묶고, 선택하면 학생을 단계별로 묶는다', async () => {
    fetchMock.mockImplementation(baseRoute());
    const { result } = await loadedBoard();
    expect(result.current.strategyGroups.map((g) => g.name)).toEqual(['A']);
    expect(result.current.retryCategoryId).toBe('c1');
    expect(stageOf(result, 's-2')).toBe('상담 중');
  });

  it('드래그가 성공하면 단계를 옮기고 onStudentUpdate를 부른다', async () => {
    fetchMock.mockImplementation(baseRoute());
    const { result, onStudentUpdate } = await loadedBoard();
    await act(async () => {
      await result.current.drag.handleDragEnd(dragEvent('s-1', '제안 완료'));
    });
    expect(stageOf(result, 's-1')).toBe('제안 완료');
    expect(onStudentUpdate).toHaveBeenCalledWith('s-1', { retry_stage: '제안 완료' });
    const patch = fetchMock.mock.calls.find((c) => c[1]?.method === 'PATCH');
    expect(patch?.[0]).toBe('/api/crm/students/s-1');
    expect(JSON.parse(patch?.[1].body)).toEqual({ retry_stage: '제안 완료' });
  });

  it('드래그 저장이 실패하면 단계를 되돌리고 알림을 띄우며 onStudentUpdate는 부르지 않는다', async () => {
    fetchMock.mockImplementation(baseRoute(() => ({ ok: false, status: 500, json: async () => ({}) })));
    const { result, onStudentUpdate } = await loadedBoard();
    await act(async () => {
      await result.current.drag.handleDragEnd(dragEvent('s-1', '제안 완료'));
    });
    expect(stageOf(result, 's-1')).toBe('연락 시도');
    expect(alert).toHaveBeenCalledWith('단계 이동 저장에 실패했습니다.');
    expect(onStudentUpdate).not.toHaveBeenCalled();
  });

  it('같은 단계·보드 밖·알 수 없는 단계로의 드롭은 요청하지 않는다', async () => {
    fetchMock.mockImplementation(baseRoute());
    const { result } = await loadedBoard();
    const before = fetchMock.mock.calls.length;
    await act(async () => {
      await result.current.drag.handleDragEnd(dragEvent('s-1', '연락 시도'));
      await result.current.drag.handleDragEnd(dragEvent('s-1', null));
      await result.current.drag.handleDragEnd(dragEvent('s-1', '엉뚱한곳'));
    });
    expect(fetchMock.mock.calls.length).toBe(before);
  });

  it('학생 제거는 확인 후 PATCH 성공 시에만 보드에서 뺀다', async () => {
    fetchMock.mockImplementation(baseRoute());
    const { result } = await loadedBoard();
    await act(async () => {
      await result.current.handleRemoveLead(STUDENTS[0] as never);
    });
    expect(stageOf(result, 's-1')).toBeUndefined();
  });

  it('전략 삭제는 선택 중인 전략이면 선택을 해제한다', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === 'DELETE' ? ok({}) : baseRoute()(url, init)
    );
    const { result } = await loadedBoard();
    await act(async () => {
      await result.current.handleDeleteStrategy('st-1');
    });
    expect(result.current.strategies).toHaveLength(0);
    expect(result.current.selectedId).toBeNull();
  });
});
