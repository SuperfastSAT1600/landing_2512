import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MatchingCleanupPanel } from '../MatchingCleanupPanel';
import type { MatchingCleanup } from '@/lib/matching-cleanup';

const data: MatchingCleanup = {
  stale: [
    { profileId: 'p-n', student: 'Nathan Ra', crmStudentId: 'crm-n', subject: 'SAT', status: 'active', matchingId: 'm2', coach: 'Siwon Park', activatedAt: '2026-06-12T05:19:13Z', lastLesson: '2026-06-13T00:30:00Z', entryCode: 'ZFP4SD', keepCoaches: ['Ben'] },
    { profileId: 'p-p', student: '박주람', crmStudentId: null, subject: 'SAT', status: 'paused', matchingId: 'm9', coach: '성주희', activatedAt: '2026-07-14T00:00:00Z', lastLesson: null, entryCode: 'OCZD3F', keepCoaches: ['Julie'] },
  ],
  unclear: [{
    profileId: 'p-y', student: '윤준혁02', crmStudentId: 'crm-y', subject: 'SAT', status: 'active',
    matchings: [
      { matchingId: 'a', coach: 'Ben', activatedAt: '2026-05-31T00:00:00Z', lastLesson: '2026-03-01T00:00:00Z', entryCode: '7JFZAT' },
      { matchingId: 'b', coach: 'Chris', activatedAt: '2026-07-16T00:00:00Z', lastLesson: '2026-09-06T00:00:00Z', entryCode: '6AVJJ7' },
    ],
  }],
};

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

// REQ-003 (crm-matching-cleanup-panel)
describe('MatchingCleanupPanel', () => {
  beforeEach(() => fetchMock.mockReset());

  it('Deactivate 추천과 확인 필요를 건수와 함께 보여 준다', async () => {
    fetchMock.mockReturnValueOnce(json({ data }));
    render(<MatchingCleanupPanel adminKey="k" reloadKey={0} onSelectStudentById={vi.fn()} />);
    const stale = await screen.findByTestId('cleanup-stale');
    expect(within(stale).getByText(/Deactivate 추천/).textContent).toContain('2건');
    const nathan = within(stale).getAllByRole('listitem')[0];
    expect(nathan.textContent).toContain('Siwon Park');
    expect(nathan.textContent).toContain('26.06.13');
    expect(nathan.textContent).toContain('ZFP4SD');
    expect(nathan.textContent).toContain('지금 수업: Ben');
    expect(within(stale).getAllByRole('listitem')[1].textContent).toContain('수업 기록 없음');
    const unclear = screen.getByTestId('cleanup-unclear');
    expect(within(unclear).getByText(/확인 필요/).textContent).toContain('1명');
    expect(unclear.textContent).toContain('7JFZAT');
    expect(unclear.textContent).toContain('Chris');
    expect(fetchMock).toHaveBeenCalledWith('/api/crm/coach-roster/cleanup', expect.objectContaining({ headers: { 'x-admin-key': 'k' } }));
  });

  it('CRM 학생 이름을 누르면 학생 패널을 연다(미연결은 버튼 아님)', async () => {
    fetchMock.mockReturnValueOnce(json({ data }));
    const onSelect = vi.fn();
    render(<MatchingCleanupPanel adminKey="k" reloadKey={0} onSelectStudentById={onSelect} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Nathan Ra' }));
    expect(onSelect).toHaveBeenCalledWith('crm-n');
    expect(screen.queryByRole('button', { name: '박주람' })).toBeNull();
  });

  it('정리할 매칭이 없으면 안내 문구', async () => {
    fetchMock.mockReturnValueOnce(json({ data: { stale: [], unclear: [] } }));
    render(<MatchingCleanupPanel adminKey="k" reloadKey={0} onSelectStudentById={vi.fn()} />);
    expect(await screen.findByText('정리할 매칭이 없습니다')).toBeTruthy();
  });

  it('불러오지 못하면 오류 문구', async () => {
    fetchMock.mockReturnValueOnce(json({ error: { code: 'UPSTREAM_ERROR', message: 'x' } }, 502));
    render(<MatchingCleanupPanel adminKey="k" reloadKey={0} onSelectStudentById={vi.fn()} />);
    expect(await screen.findByText(/불러오지 못했습니다/)).toBeTruthy();
  });

  it('reloadKey가 바뀌면 다시 불러온다', async () => {
    fetchMock.mockReturnValue(json({ data }));
    const { rerender } = render(<MatchingCleanupPanel adminKey="k" reloadKey={0} onSelectStudentById={vi.fn()} />);
    await screen.findByTestId('cleanup-stale');
    rerender(<MatchingCleanupPanel adminKey="k" reloadKey={1} onSelectStudentById={vi.fn()} />);
    await screen.findByTestId('cleanup-stale');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
