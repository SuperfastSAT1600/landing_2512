import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WinbackBulkBar } from '../WinbackBulkBar';

function setup(overrides: Partial<Parameters<typeof WinbackBulkBar>[0]> = {}) {
  const props = {
    selectedCount: 3,
    alreadySentCount: 0,
    onSharedSend: vi.fn().mockResolvedValue(undefined),
    onMarkSent: vi.fn(),
    onMarkNoResponse: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  };
  render(<WinbackBulkBar {...props} />);
  return props;
}

const openComposer = () =>
  fireEvent.click(screen.getByRole('button', { name: /공통 문구로 발송 기록/ }));

describe('WinbackBulkBar — 공통 문구 일괄 발송', () => {
  it('선택 인원수를 보여준다', () => {
    setup();
    expect(screen.getByText('3명 선택')).toBeTruthy();
  });

  it('공통 문구 입력란은 버튼을 눌러야 열린다', () => {
    setup();
    expect(screen.queryByPlaceholderText(/함께 보낼 문구/)).toBeNull();
    openComposer();
    expect(screen.getByPlaceholderText(/함께 보낼 문구/)).toBeTruthy();
  });

  it('문구를 입력하고 누르면 그 문구로 onSharedSend를 호출한다', async () => {
    const { onSharedSend } = setup();
    openComposer();

    fireEvent.change(screen.getByPlaceholderText(/함께 보낼 문구/), {
      target: { value: '가을학기 AP 수업 오픈했습니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /3명 발송 기록/ }));

    await waitFor(() =>
      expect(onSharedSend).toHaveBeenCalledWith('가을학기 AP 수업 오픈했습니다.')
    );
  });

  it('문구가 비면 발송 버튼이 비활성이다', () => {
    const { onSharedSend } = setup();
    openComposer();

    const send = screen.getByRole('button', { name: /3명 발송 기록/ }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText(/함께 보낼 문구/), { target: { value: '   ' } });
    expect((screen.getByRole('button', { name: /3명 발송 기록/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(send);
    expect(onSharedSend).not.toHaveBeenCalled();
  });

  it('이미 발송된 건이 있으면 덮어쓰지 않는다고 알린다', () => {
    setup({ alreadySentCount: 1 });
    openComposer();
    expect(screen.getByText(/이미 발송된 1명은 기존 기록을 유지/)).toBeTruthy();
  });

  it('발송 완료 건이 없으면 안내를 띄우지 않는다', () => {
    setup({ alreadySentCount: 0 });
    openComposer();
    expect(screen.queryByText(/기존 기록을 유지/)).toBeNull();
  });

  it('처리 중에는 중복 클릭해도 한 번만 보낸다', async () => {
    let resolve!: () => void;
    const onSharedSend = vi.fn().mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    setup({ onSharedSend });
    openComposer();

    fireEvent.change(screen.getByPlaceholderText(/함께 보낼 문구/), { target: { value: '문구' } });
    fireEvent.click(screen.getByRole('button', { name: /3명 발송 기록/ }));
    fireEvent.click(screen.getByRole('button', { name: /기록 중/ }));

    expect(onSharedSend).toHaveBeenCalledTimes(1);
    resolve();
    await waitFor(() => expect(screen.queryByPlaceholderText(/함께 보낼 문구/)).toBeNull());
  });

  it('기존 일괄 동작(행별 문구·무응답·해제)은 그대로 남는다', () => {
    const { onMarkSent, onMarkNoResponse, onClear } = setup();
    fireEvent.click(screen.getByRole('button', { name: /^발송함으로 기록$/ }));
    fireEvent.click(screen.getByRole('button', { name: /무응답 처리/ }));
    fireEvent.click(screen.getByRole('button', { name: /해제/ }));
    expect(onMarkSent).toHaveBeenCalled();
    expect(onMarkNoResponse).toHaveBeenCalled();
    expect(onClear).toHaveBeenCalled();
  });
});
