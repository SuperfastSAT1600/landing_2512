import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SrmStatusBar } from '../SrmStatusBar';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const confirmMock = vi.fn();
vi.stubGlobal('confirm', confirmMock);
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const subjects = (status: string) => ({ data: { subjects: [{ subject: 'SAT', status }] } });

// REQ-003 (crm-srm-status)
describe('SrmStatusBar', () => {
  beforeEach(() => { fetchMock.mockReset(); confirmMock.mockReset(); });

  it('과목별 현재 상태를 보여 주고 불러온 값을 알린다', async () => {
    fetchMock.mockReturnValueOnce(json(subjects('active')));
    const onLoad = vi.fn();
    render(<SrmStatusBar studentId="s1" adminKey="k" onLoad={onLoad} onChange={vi.fn()} />);
    const select = await screen.findByLabelText('SAT 수강 상태') as HTMLSelectElement;
    expect(select.value).toBe('active');
    expect(fetchMock).toHaveBeenCalledWith('/api/crm/students/s1/srm-status', expect.objectContaining({ headers: { 'x-admin-key': 'k' } }));
    expect(onLoad).toHaveBeenCalledWith([{ subject: 'SAT', status: 'active' }]);
  });

  it('확인하면 PATCH로 바꾸고 변경을 알린다', async () => {
    fetchMock.mockReturnValueOnce(json(subjects('active'))).mockReturnValueOnce(json(subjects('paused')));
    confirmMock.mockReturnValue(true);
    const onChange = vi.fn();
    render(<SrmStatusBar studentId="s1" adminKey="k" onLoad={vi.fn()} onChange={onChange} />);
    fireEvent.change(await screen.findByLabelText('SAT 수강 상태'), { target: { value: 'paused' } });
    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('재원 → 휴원'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([{ subject: 'SAT', status: 'paused' }]));
    const [, init] = fetchMock.mock.calls[1];
    expect(init).toMatchObject({ method: 'PATCH', body: JSON.stringify({ subject: 'SAT', status: 'paused' }) });
    expect((screen.getByLabelText('SAT 수강 상태') as HTMLSelectElement).value).toBe('paused');
  });

  it('취소하면 요청하지 않는다', async () => {
    fetchMock.mockReturnValueOnce(json(subjects('active')));
    confirmMock.mockReturnValue(false);
    render(<SrmStatusBar studentId="s1" adminKey="k" onLoad={vi.fn()} onChange={vi.fn()} />);
    const select = await screen.findByLabelText('SAT 수강 상태') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'inactive' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(select.value).toBe('active');
  });

  it('실패하면 원래 값을 유지하고 오류를 보여 준다', async () => {
    fetchMock.mockReturnValueOnce(json(subjects('active')))
      .mockReturnValueOnce(json({ error: { code: 'UPSTREAM_ERROR', message: 'boom' } }, 502));
    confirmMock.mockReturnValue(true);
    const onChange = vi.fn();
    render(<SrmStatusBar studentId="s1" adminKey="k" onLoad={vi.fn()} onChange={onChange} />);
    fireEvent.change(await screen.findByLabelText('SAT 수강 상태'), { target: { value: 'inactive' } });
    await screen.findByText(/변경하지 못했습니다/);
    expect((screen.getByLabelText('SAT 수강 상태') as HTMLSelectElement).value).toBe('active');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('SRM 미연결이면 아무것도 그리지 않는다', async () => {
    fetchMock.mockReturnValueOnce(json({ error: { code: 'no_v2_profile', message: '' } }, 404));
    const onLoad = vi.fn();
    const { container } = render(<SrmStatusBar studentId="s1" adminKey="k" onLoad={onLoad} onChange={vi.fn()} />);
    await waitFor(() => expect(onLoad).toHaveBeenCalledWith([]));
    expect(container.textContent).toBe('');
  });

  it('조회가 실패하면 오류를 알리고 상태를 비운 것으로 보고하지 않는다', async () => {
    fetchMock.mockReturnValueOnce(json({ error: { code: 'UPSTREAM_ERROR', message: 'boom' } }, 502));
    const onLoad = vi.fn();
    render(<SrmStatusBar studentId="s1" adminKey="k" onLoad={onLoad} onChange={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toContain('불러오지 못했습니다');
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('변경 중에 다른 학생으로 바뀌면 늦게 온 응답을 알리지 않는다', async () => {
    let resolvePatch: (r: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(json(subjects('active')))
      .mockReturnValueOnce(new Promise<Response>((r) => { resolvePatch = r; }));
    confirmMock.mockReturnValue(true);
    const onChange = vi.fn();
    const { unmount } = render(<SrmStatusBar studentId="s1" adminKey="k" onLoad={vi.fn()} onChange={onChange} />);
    fireEvent.change(await screen.findByLabelText('SAT 수강 상태'), { target: { value: 'paused' } });
    unmount();
    resolvePatch(new Response(JSON.stringify(subjects('paused')), { status: 200 }));
    await new Promise((r) => setTimeout(r, 0));
    expect(onChange).not.toHaveBeenCalled();
  });
});
