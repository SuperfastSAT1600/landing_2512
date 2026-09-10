import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WeeklyTracks } from '../weekly/WeeklyTracks';
import type { RetryStrategy, WeeklyExecutionRow, WeeklyTrack } from '@/types/crm';

const LIBRARY: RetryStrategy[] = [
  { id: 's-report', name: '진단리포트 당일등록 할인', description: null, type: 'initial_sales', segment: 'b2c', created_at: 'x' },
  { id: 's-retry', name: '인스타 상담 재신청', description: null, type: 'retry', segment: 'b2c', created_at: 'x' },
];

const track: WeeklyTrack = {
  id: 't-1',
  name: '신규리드',
  goal_text: '인스타리드 2건 결제',
  metric: null,
  target_value: 0,
  achieved: false,
  items: [
    { id: 'i-1', text: '첫 세일즈콜 후 상담 포탈 전달', done: false, done_at: null, strategy_id: null, strategy_name: null, strategy_type: null },
  ],
  carried_from_week: null,
};

const unplannedExecution: WeeklyExecutionRow[] = [
  {
    strategy_id: 's-retry',
    strategy_name: '인스타 상담 재신청',
    type: 'retry',
    planned: false,
    applied_count: 1,
    contacted_count: 0,
    paid_count: 0,
    revenue: 0,
    leads: [{ student_id: 'u9', name: '최OO', applied_at: '2026-08-20T02:00:00Z', memo: '', contacted: false, paid: false, revenue: 0 }],
  },
];

function setup(tracks: WeeklyTrack[] = [], execution: WeeklyExecutionRow[] = []) {
  const onChange = vi.fn();
  render(
    <WeeklyTracks
      segment="b2c"
      adminKey="admin-key"
      tracks={tracks}
      execution={execution}
      logAt="2026-08-19T02:00:00Z"
      onChange={onChange}
      onLogged={vi.fn()}
    />,
  );
  return { onChange };
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: LIBRARY }) })),
  );
});

describe('WeeklyTracks', () => {
  it('비어 있으면 트랙을 만들라고 안내한다', () => {
    setup();
    expect(screen.getByText(/트랙 추가/)).toBeTruthy();
    expect(screen.getByText('이번 주에 밀어볼 트랙을 만드세요.')).toBeTruthy();
  });

  it('프리셋 칩을 누르면 그 이름으로 트랙을 즉시 만든다', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: /트랙 추가/ }));
    fireEvent.click(screen.getByRole('button', { name: '이탈 리드 캠페인' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const added = onChange.mock.calls[0][0];
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ name: '이탈 리드 캠페인', goal_text: '', metric: null, items: [] });
  });

  it('B2C 프리셋을 보여준다', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /트랙 추가/ }));
    expect(screen.getByRole('button', { name: '신규리드' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '기타' })).toBeTruthy();
  });

  it('빈 이름으로 트랙을 만들 수도 있다', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: /트랙 추가/ }));
    fireEvent.click(screen.getByRole('button', { name: '이름 없이 추가' }));
    expect(onChange.mock.calls[0][0][0]).toMatchObject({ name: '', items: [] });
  });

  it('실행 항목을 Enter로 연속 추가한다', () => {
    const { onChange } = setup([track]);
    const input = screen.getByPlaceholderText('실행 항목 추가… (Enter로 계속)');

    fireEvent.change(input, { target: { value: '진단 테스트 20만원 할인' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0][0].items.map((i: { text: string }) => i.text)).toEqual([
      '첫 세일즈콜 후 상담 포탈 전달',
      '진단 테스트 20만원 할인',
    ]);
    // 연속 입력을 위해 입력칸이 비고 포커스가 남는다
    expect((input as HTMLInputElement).value).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('빈 텍스트로는 항목을 추가하지 않는다', () => {
    const { onChange } = setup([track]);
    const input = screen.getByPlaceholderText('실행 항목 추가… (Enter로 계속)');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('항목 완료 토글은 즉시 저장한다', () => {
    const { onChange } = setup([track]);
    fireEvent.click(screen.getByLabelText('완료 토글'));
    const saved = onChange.mock.calls[0][0][0].items[0];
    expect(saved.done).toBe(true);
    expect(saved.done_at).toMatch(/^\d{4}-/);
  });

  it('항목 텍스트는 blur에서 저장한다', () => {
    const { onChange } = setup([track]);
    const text = screen.getByLabelText('실행 항목');

    fireEvent.change(text, { target: { value: '수정된 항목' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(text);
    expect(onChange.mock.calls[0][0][0].items[0].text).toBe('수정된 항목');
  });

  it('항목에 전략을 연결하면 스냅샷과 함께 즉시 저장한다', async () => {
    const { onChange } = setup([track]);
    fireEvent.click(screen.getByLabelText('전략 연결'));

    const option = await screen.findByRole('button', { name: /진단리포트 당일등록 할인/ });
    fireEvent.click(option);

    const saved = onChange.mock.calls[0][0][0].items[0];
    expect(saved).toMatchObject({
      strategy_id: 's-report',
      strategy_name: '진단리포트 당일등록 할인',
      strategy_type: 'initial_sales',
    });
  });

  it('항목 삭제는 즉시 저장한다', () => {
    const { onChange } = setup([track]);
    fireEvent.click(screen.getByLabelText('항목 삭제'));
    expect(onChange.mock.calls[0][0][0].items).toEqual([]);
  });

  it('트랙 삭제는 목록에서 제거한다', () => {
    const { onChange } = setup([track]);
    fireEvent.click(screen.getByLabelText('트랙 삭제'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('트랙에 연결되지 않은 실행은 계획 외 실행으로 모은다', () => {
    setup([track], unplannedExecution);
    const toggle = screen.getByRole('button', { name: /계획 외 실행 1건/ });
    fireEvent.click(toggle);
    expect(screen.getByText('인스타 상담 재신청')).toBeTruthy();
  });

  it('계획 외 실행이 없으면 그 블록을 숨긴다', () => {
    setup([track], []);
    expect(screen.queryByText(/계획 외 실행/)).toBeNull();
  });

  it('세그먼트 라벨을 켜면 소제목을 보여준다', () => {
    render(
      <WeeklyTracks
        segment="b2b"
        adminKey="admin-key"
        tracks={[]}
        execution={[]}
        logAt="2026-08-19T02:00:00Z"
        showSegmentLabel
        onChange={vi.fn()}
        onLogged={vi.fn()}
      />,
    );
    expect(screen.getByText('B2B')).toBeTruthy();
  });

  it('B2B 프리셋은 B2B 이름을 쓴다', async () => {
    render(
      <WeeklyTracks
        segment="b2b"
        adminKey="admin-key"
        tracks={[]}
        execution={[]}
        logAt="2026-08-19T02:00:00Z"
        onChange={vi.fn()}
        onLogged={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /트랙 추가/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: '소프트웨어 판매' })).toBeTruthy());
    expect(screen.queryByRole('button', { name: '신규리드' })).toBeNull();
  });
});
