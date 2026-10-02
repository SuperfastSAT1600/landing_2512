import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import type { RenewalStage, RenewalTarget } from '@/types/crm';
import { useRenewalDrag } from '../use-renewal-drag';
import { useRenewalMutations } from '../use-renewal-mutations';
import { useRenewalPayment } from '../use-renewal-payment';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function target(id: string, stage: RenewalStage, extra: Partial<RenewalTarget> = {}): RenewalTarget {
  return {
    id,
    student_id: `stu-${id}`,
    stage,
    memo: null,
    next_contact_date: null,
    stage_updated_at: '2026-08-10T00:00:00Z',
    carried_to_week: null,
    ...extra,
  } as RenewalTarget;
}

const res = (ok: boolean, body: unknown = {}) => ({ ok, status: ok ? 200 : 400, json: async () => body });
const dragEvent = (activeId: string, overId: string): DragEndEvent =>
  ({ active: { id: activeId }, over: { id: overId } }) as unknown as DragEndEvent;

/** 보드 상태(targets/error)를 실제 state 로 들고 세 훅을 조립한다. */
function setup(initial: RenewalTarget[]) {
  const refresh = vi.fn(async () => {});
  const onStudentUpdate = vi.fn();
  const hook = renderHook(() => {
    const [targets, setTargets] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const mutations = useRenewalMutations({ adminKey: 'k', userName: '민재', setTargets, setError, refresh });
    const { patchTarget } = mutations;
    const drag = useRenewalDrag({ targets, setTargets, setError, refresh, patchTarget });
    const pay = useRenewalPayment({ adminKey: 'k', patchTarget, setError, refresh, onStudentUpdate });
    return { targets, error, mutations, drag, pay };
  });
  return { ...hook, refresh, onStudentUpdate };
}

describe('renewal 보드 훅', () => {
  beforeEach(() => fetchMock.mockReset());

  it('드래그 성공: 낙관적으로 단계를 옮기고 PATCH 후 refresh 한다', async () => {
    fetchMock.mockResolvedValue(res(true));
    const { result, refresh } = setup([target('a', '1')]);
    await act(() => result.current.drag.handleDragEnd(dragEvent('a', '2')));
    expect(result.current.targets[0].stage).toBe('2');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/crm/renewal-targets/a');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ stage: '2' });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('드래그 실패: 단계를 되돌리고 서버 메시지를 에러로 올린다', async () => {
    fetchMock.mockResolvedValue(res(false, { error: { code: 'X', message: '사유 필요' } }));
    const { result } = setup([target('a', '1')]);
    await act(() => result.current.drag.handleDragEnd(dragEvent('a', '2')));
    expect(result.current.targets[0].stage).toBe('1');
    expect(result.current.error).toBeTruthy();
  });

  it('터미널 단계 진입·이월된 행·같은 단계 드롭은 요청하지 않는다', async () => {
    const { result } = setup([
      target('a', '1'),
      target('b', '2', { carried_to_week: '2026-08-17' }),
      target('c', '4'),
    ]);
    await act(async () => {
      await result.current.drag.handleDragEnd(dragEvent('a', '4'));
      await result.current.drag.handleDragEnd(dragEvent('b', '3'));
      await result.current.drag.handleDragEnd(dragEvent('c', '2'));
      await result.current.drag.handleDragEnd(dragEvent('a', '1'));
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('메모 저장: trim 후 낙관 반영, 변화 없으면 요청 없음, 실패하면 되돌리고 에러', async () => {
    fetchMock.mockResolvedValue(res(false));
    const { result } = setup([target('a', '1', { memo: '기존' })]);
    await act(() => result.current.mutations.handleMemoSave(result.current.targets[0], '  기존  '));
    expect(fetchMock).not.toHaveBeenCalled();
    await act(() => result.current.mutations.handleMemoSave(result.current.targets[0], '새 메모'));
    expect(result.current.targets[0].memo).toBe('기존');
    expect(result.current.error).toBe('메모 저장에 실패했습니다.');
  });

  it('메모를 비우면 null 로 저장한다', async () => {
    fetchMock.mockResolvedValue(res(true));
    const { result } = setup([target('a', '1', { memo: '기존' })]);
    await act(() => result.current.mutations.handleMemoSave(result.current.targets[0], '   '));
    expect(result.current.targets[0].memo).toBeNull();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ memo: null });
  });

  it('대상 추가: 성공하면 refresh, pendingStudentId 는 끝나면 null', async () => {
    fetchMock.mockResolvedValue(res(true, { data: {} }));
    const { result, refresh } = setup([]);
    await act(() => result.current.mutations.handleAdd('stu-9'));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ student_id: 'stu-9' });
    expect(refresh).toHaveBeenCalled();
    expect(result.current.mutations.pendingStudentId).toBeNull();
  });

  it('결제 확정 후 전환 PATCH 가 실패하면 재시도 상태를 남기고, 재시도 성공하면 비운다', async () => {
    const { result, onStudentUpdate } = setup([target('a', '3')]);
    fetchMock.mockResolvedValueOnce(res(true, { data: { id: 'stu-a', name: '김하나' } }));
    await act(() => result.current.pay.openPayment(result.current.targets[0]));
    expect(result.current.pay.payment?.student.name).toBe('김하나');

    fetchMock.mockResolvedValueOnce(res(false));
    await act(() => result.current.pay.handlePaymentConfirm({ id: 'stu-a', name: '김하나' } as never, 'pay-1'));
    expect(onStudentUpdate).toHaveBeenCalledWith('stu-a', { id: 'stu-a', name: '김하나' });
    expect(result.current.pay.payment).toBeNull();
    expect(result.current.pay.pendingConversion).toEqual({
      targetId: 'a',
      paymentId: 'pay-1',
      studentName: '김하나',
    });
    expect(result.current.error).toContain('김하나 결제는 기록됐지만');

    fetchMock.mockResolvedValueOnce(res(true));
    await act(() => result.current.pay.convertToPaid('a', 'pay-1', '김하나'));
    expect(result.current.pay.pendingConversion).toBeNull();
    expect(JSON.parse(fetchMock.mock.calls.at(-1)![1].body)).toEqual({
      stage: '4',
      converted_payment_id: 'pay-1',
    });
  });

  it('학생 조회가 실패하면 결제 창을 열지 않고 에러를 올린다', async () => {
    fetchMock.mockResolvedValue(res(false));
    const { result } = setup([target('a', '3')]);
    await act(() => result.current.pay.openPayment(result.current.targets[0]));
    expect(result.current.pay.payment).toBeNull();
    expect(result.current.error).toBe('학생 정보를 불러오지 못해 결제 창을 열 수 없습니다.');
  });
});
