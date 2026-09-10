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
