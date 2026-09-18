import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WinbackPlayDetail } from '../WinbackPlayDetail';
import type { WinbackPlayDetailData } from '../hooks/useWinbackPlays';

const PLAY: WinbackPlayDetailData = {
  id: 'p1',
  title: 'AP 5월 프로모션',
  status: 'running',
  product_brief: '브리프',
  conversion_window_days: 45,
  variants: [{ id: 'v1', name: '기본' }] as WinbackPlayDetailData['variants'],
  targets: [],
} as unknown as WinbackPlayDetailData;

function target(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    student_id: `s-${id}`,
    student: { id: `s-${id}`, name: `학생${id}`, grade: '11', parent_phone: null, lead_status: 'inactive', churn_tag: null },
    variant_id: 'v1',
    rank: 1,
    score: 70,
    signals: [],
    reason: '',
    status: 'queued',
    sent_at: null,
    sent_message: null,
    message_draft: null,
    response: null,
    reconnected_at: null,
    converted_at: null,
    ...over,
  };
}

const PLAY_WITH_TARGETS = {
  ...PLAY,
  targets: [target('t1'), target('t2'), target('t3')],
} as unknown as WinbackPlayDetailData;

function setup(overrides: Partial<Parameters<typeof WinbackPlayDetail>[0]> = {}) {
  const onBack = vi.fn();
  const deletePlay = vi.fn().mockResolvedValue(undefined);
  render(
    <WinbackPlayDetail
      playId="p1"
      onBack={onBack}
      fetchPlay={vi.fn().mockResolvedValue(PLAY)}
      patchTarget={vi.fn()}
      bulkTargets={vi.fn()}
      deletePlay={deletePlay}
      {...overrides}
    />
  );
  return { onBack, deletePlay };
}

describe('WinbackPlayDetail 삭제 (REQ-003)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('confirm 취소 시 deletePlay를 호출하지 않는다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { deletePlay } = setup();
    await screen.findByText('AP 5월 프로모션');

    fireEvent.click(screen.getByRole('button', { name: /삭제/ }));

    expect(deletePlay).not.toHaveBeenCalled();
  });

  it('confirm 승인 시 deletePlay 성공하면 onBack을 호출한다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { onBack, deletePlay } = setup();
    await screen.findByText('AP 5월 프로모션');

    fireEvent.click(screen.getByRole('button', { name: /삭제/ }));

    await waitFor(() => expect(deletePlay).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(onBack).toHaveBeenCalled());
  });

  it('deletePlay 실패 시 onBack을 호출하지 않고 에러를 보여준다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { onBack } = setup({ deletePlay: vi.fn().mockRejectedValue(new Error('삭제 실패')) });
    await screen.findByText('AP 5월 프로모션');

    fireEvent.click(screen.getByRole('button', { name: /삭제/ }));

    await screen.findByText('삭제 실패');
    expect(onBack).not.toHaveBeenCalled();
  });
});


describe('WinbackPlayDetail 공통 문구 일괄 발송 (REQ-001)', () => {
  afterEach(() => vi.restoreAllMocks());

  type BulkFn = Parameters<typeof WinbackPlayDetail>[0]['bulkTargets'];

  async function selectAllAndSend(text: string, bulkTargets: ReturnType<typeof vi.fn>) {
    render(
      <WinbackPlayDetail
        playId="p1"
        userName="이민재"
        onBack={vi.fn()}
        fetchPlay={vi.fn().mockResolvedValue(PLAY_WITH_TARGETS)}
        patchTarget={vi.fn()}
        bulkTargets={bulkTargets as unknown as BulkFn}
        deletePlay={vi.fn()}
      />
    );
    await screen.findByText('AP 5월 프로모션');

    screen
      .getAllByRole('checkbox')
      .forEach((box) => { if (!(box as HTMLInputElement).checked) fireEvent.click(box); });

    fireEvent.click(screen.getByRole('button', { name: /공통 문구로 발송 기록/ }));
    fireEvent.change(screen.getByPlaceholderText(/함께 보낼 문구/), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: /3명 발송 기록/ }));
  }

  it('선택한 전원에게 같은 문구를 매핑해 보낸다', async () => {
    const bulkTargets = vi.fn().mockResolvedValue({ updated: [], failed: [] });
    await selectAllAndSend('가을학기 AP 수업 오픈했습니다.', bulkTargets);

    await waitFor(() => expect(bulkTargets).toHaveBeenCalled());
    const payload = bulkTargets.mock.calls[0][0];
    expect(payload.action).toBe('mark_sent');
    expect(payload.author).toBe('이민재');
    expect(payload.target_ids.sort()).toEqual(['t1', 't2', 't3']);
    expect(payload.messages).toEqual({
      t1: '가을학기 AP 수업 오픈했습니다.',
      t2: '가을학기 AP 수업 오픈했습니다.',
      t3: '가을학기 AP 수업 오픈했습니다.',
    });
  });

  it('일부 실패하면 실패 건수를 알린다', async () => {
    const bulkTargets = vi.fn().mockResolvedValue({
      updated: [{ id: 't1' }],
      failed: [{ id: 't2', error: '타겟을 찾을 수 없습니다.' }],
    });
    await selectAllAndSend('문구', bulkTargets);

    await screen.findByText(/1건 실패: 타겟을 찾을 수 없습니다./);
  });
});

describe('WinbackPlayDetail 타겟 전체 선택', () => {
  afterEach(() => vi.restoreAllMocks());

  async function renderWith(play: WinbackPlayDetailData) {
    render(
      <WinbackPlayDetail
        playId="p1"
        userName="이민재"
        onBack={vi.fn()}
        fetchPlay={vi.fn().mockResolvedValue(play)}
        patchTarget={vi.fn()}
        bulkTargets={vi.fn()}
        deletePlay={vi.fn()}
      />
    );
    await screen.findByText('AP 5월 프로모션');
  }

  const selectAllBox = () =>
    screen.getByRole('checkbox', { name: '타겟 전체 선택' }) as HTMLInputElement;
  const rowBoxes = () =>
    screen.getAllByRole('checkbox').filter((b) => b !== selectAllBox()) as HTMLInputElement[];

  it('전체 선택을 누르면 모든 타겟이 선택된다', async () => {
    await renderWith(PLAY_WITH_TARGETS);

    fireEvent.click(screen.getByRole('button', { name: '전체 선택' }));

    expect(rowBoxes().every((b) => b.checked)).toBe(true);
    expect(screen.getByText('3명 선택')).toBeTruthy();
  });

  it('전체 선택된 상태에서 다시 누르면 전부 해제된다', async () => {
    await renderWith(PLAY_WITH_TARGETS);

    fireEvent.click(screen.getByRole('button', { name: '전체 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '전체 해제' }));

    expect(rowBoxes().some((b) => b.checked)).toBe(false);
  });

  it('헤더 체크박스로도 전체 선택·해제가 된다', async () => {
    await renderWith(PLAY_WITH_TARGETS);

    fireEvent.click(selectAllBox());
    expect(rowBoxes().every((b) => b.checked)).toBe(true);

    fireEvent.click(selectAllBox());
    expect(rowBoxes().some((b) => b.checked)).toBe(false);
  });

  it('일부만 선택하면 헤더 체크박스가 indeterminate가 된다', async () => {
    await renderWith(PLAY_WITH_TARGETS);

    fireEvent.click(rowBoxes()[0]);

    expect(selectAllBox().indeterminate).toBe(true);
    expect(selectAllBox().checked).toBe(false);
  });

  it('선택 수와 전체 수를 함께 보여준다', async () => {
    await renderWith(PLAY_WITH_TARGETS);

    expect(screen.getByText('타겟 3명')).toBeTruthy();

    fireEvent.click(rowBoxes()[0]);
    expect(screen.getByText('3명 중 1명 선택')).toBeTruthy();
  });

  it('타겟이 없으면 전체 선택 UI를 띄우지 않는다', async () => {
    await renderWith(PLAY);

    expect(screen.queryByRole('button', { name: '전체 선택' })).toBeNull();
    expect(screen.queryByRole('checkbox', { name: '타겟 전체 선택' })).toBeNull();
  });
});
