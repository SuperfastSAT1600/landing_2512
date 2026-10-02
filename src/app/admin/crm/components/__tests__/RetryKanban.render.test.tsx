import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RetryKanban } from '../RetryKanban';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const STRATEGIES = [
  { id: 'st-1', name: '문자 재접촉', category_id: 'cat-1', description: '설명입니다' },
  { id: 'st-2', name: '고아 전략', category_id: 'gone', description: null },
];
const CATEGORIES = [{ id: 'cat-1', name: '카테고리A', sort_order: 1 }];
const STUDENTS = [
  { id: 's-1', name: '최연락', retry_stage: '연락 시도', retry_assigned_at: null },
  { id: 's-2', name: '정상담', retry_stage: '상담 중', retry_assigned_at: null },
];

function json(data: unknown) {
  return { ok: true, status: 200, json: async () => ({ data }) };
}

function route(searchResults: unknown[] = []) {
  return async (url: string) => {
    const u = String(url);
    if (u.startsWith('/api/crm/retry-strategies?segment=b2c')) return json(STRATEGIES);
    if (u.startsWith('/api/crm/strategy-categories')) return json(CATEGORIES);
    if (u.startsWith('/api/crm/students?retry_strategy_id=')) return json(STUDENTS);
    if (u.startsWith('/api/crm/students?pool=true&search=')) return json(searchResults);
    return json([]);
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(route());
});

function setup(props: Partial<React.ComponentProps<typeof RetryKanban>> = {}) {
  return render(
    <RetryKanban adminKey="k" onStudentClick={vi.fn()} onStudentUpdate={vi.fn()} {...props} />
  );
}

describe('RetryKanban 렌더', () => {
  it('전략을 카테고리별로 묶고 카테고리 없는 전략은 분류 없음에 둔다', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('문자 재접촉')).toBeTruthy());
    expect(screen.getByText('카테고리A')).toBeTruthy();
    expect(screen.getByText('분류 없음')).toBeTruthy();
    expect(screen.getByText('고아 전략')).toBeTruthy();
    expect(screen.getByText('좌측에서 전략을 선택하거나 새로 만드세요.')).toBeTruthy();
  });

  it('전략을 선택하면 학생을 단계 컬럼에 렌더하고 선택 알림을 보낸다', async () => {
    const onStrategyChange = vi.fn();
    setup({ onStrategyChange });
    fireEvent.click(await screen.findByText('문자 재접촉'));
    await waitFor(() => expect(screen.getByText('최연락')).toBeTruthy());
    expect(screen.getByText('정상담')).toBeTruthy();
    for (const stage of ['연락 시도', '상담 중', '제안 완료']) {
      expect(screen.getAllByText(stage).length).toBeGreaterThan(0);
    }
    expect(onStrategyChange).toHaveBeenLastCalledWith({ id: 'st-1', name: '문자 재접촉' });
    expect(
      fetchMock.mock.calls.some((c) => c[0] === '/api/crm/students?retry_strategy_id=st-1')
    ).toBe(true);
  });

  it('enrolledStudentId가 오면 해당 학생을 보드에서 빼고 onEnrolledHandled를 부른다', async () => {
    const onEnrolledHandled = vi.fn();
    const { rerender } = setup({ onEnrolledHandled });
    fireEvent.click(await screen.findByText('문자 재접촉'));
    await waitFor(() => expect(screen.getByText('최연락')).toBeTruthy());
    rerender(
      <RetryKanban
        adminKey="k"
        onStudentClick={vi.fn()}
        onStudentUpdate={vi.fn()}
        enrolledStudentId="s-1"
        onEnrolledHandled={onEnrolledHandled}
      />
    );
    await waitFor(() => expect(screen.queryByText('최연락')).toBeNull());
    expect(onEnrolledHandled).toHaveBeenCalled();
  });

  it('리드 검색은 디바운스 후 결과를 보여주되 이미 전략에 있는 학생은 제외한다', async () => {
    fetchMock.mockImplementation(
      route([
        { id: 's-1', name: '최연락' },
        { id: 's-9', name: '신규후보', parent_phone: '010' },
      ])
    );
    setup();
    fireEvent.click(await screen.findByText('문자 재접촉'));
    await waitFor(() => expect(screen.getByText('최연락')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /리드 추가/ }));
    fireEvent.change(screen.getByPlaceholderText('리드풀에서 이름 검색...'), { target: { value: '신' } });
    await waitFor(() => expect(screen.getByText('신규후보')).toBeTruthy());
    expect(screen.getAllByText('최연락')).toHaveLength(1);
  });
});
