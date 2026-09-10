import { render, screen, fireEvent } from '@testing-library/react';
import { WinbackPlayList } from '../WinbackPlayList';
import type { WinbackPlayListItem } from '../hooks/useWinbackPlays';

function play(over: Partial<WinbackPlayListItem> = {}): WinbackPlayListItem {
  return {
    id: 'p1',
    title: 'AP 5월 프로모션',
    status: 'running',
    product_brief: '브리프',
    product_category: null,
    created_at: '2026-08-01T00:00:00Z',
    rollup: { targeted: 3, sent: 2, responded: 1, converted: 0 },
    ...over,
  } as WinbackPlayListItem;
}

describe('WinbackPlayList 삭제 (REQ-002)', () => {
  const baseProps = {
    plays: [play()],
    loading: false,
    error: null,
    onOpen: vi.fn(),
    onNew: vi.fn(),
    onDelete: vi.fn(),
  };

  afterEach(() => vi.restoreAllMocks());

  it('삭제 버튼 클릭 → confirm 취소하면 onDelete를 호출하지 않는다', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<WinbackPlayList {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /삭제/ }));

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('AP 5월 프로모션')
    );
    expect(baseProps.onDelete).not.toHaveBeenCalled();
    expect(baseProps.onOpen).not.toHaveBeenCalled();
  });

  it('confirm 승인하면 onDelete(playId)를 호출하고 onOpen은 호출하지 않는다', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onDelete = vi.fn();
    render(<WinbackPlayList {...baseProps} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /삭제/ }));

    expect(onDelete).toHaveBeenCalledWith('p1');
    expect(baseProps.onOpen).not.toHaveBeenCalled();
  });

  it('onDelete가 실패하면 alert로 에러를 알린다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onDelete = vi.fn().mockRejectedValue(new Error('삭제 실패: db error'));
    render(<WinbackPlayList {...baseProps} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /삭제/ }));

    await vi.waitFor(() => expect(window.alert).toHaveBeenCalledWith('삭제 실패: db error'));
  });

  it('플레이 카드 본문 클릭은 여전히 onOpen을 호출한다', () => {
    const onOpen = vi.fn();
    render(<WinbackPlayList {...baseProps} onOpen={onOpen} />);

    fireEvent.click(screen.getByText('AP 5월 프로모션'));

    expect(onOpen).toHaveBeenCalledWith('p1');
  });
});
