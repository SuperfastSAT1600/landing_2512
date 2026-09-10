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
