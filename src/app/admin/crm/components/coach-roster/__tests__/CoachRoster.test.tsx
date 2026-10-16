import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CoachRoster } from '../CoachRoster';
import type { CoachRoster as Roster } from '@/lib/coach-roster';

const roster: Roster = {
  coaches: [
    {
      key: 'ben', slug: 'ben', name: 'Ben', linked: true, registered: true, activeCount: 1, onboardingCount: 0, pausedCount: 1,
      students: [
        { profileId: 'p1', crmStudentId: 'crm-1', name: '김주하', status: 'active', recentLesson: true, subjects: [{ subject: 'SAT', status: 'active', recent: true }] },
        { profileId: 'p2', crmStudentId: null, name: '에이든', status: 'paused', recentLesson: false, subjects: [{ subject: 'SAT', status: 'paused', recent: false }] },
      ],
    },
    { key: 'julie', slug: 'julie', name: 'Julie', linked: true, registered: true, activeCount: 0, onboardingCount: 0, pausedCount: 0, students: [] },
    { key: 'v2:t9', slug: null, name: '배병윤', linked: true, registered: false, activeCount: 1, onboardingCount: 0, pausedCount: 0,
      students: [{ profileId: 'p1', crmStudentId: 'crm-1', name: '김주하', status: 'active', recentLesson: true, subjects: [{ subject: 'SAT', status: 'active', recent: true }] }] },
  ],
  unassigned: [{ profileId: 'p3', crmStudentId: 'crm-3', name: '조유인', status: 'active', recentLesson: false, subjects: [] }],
};

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

// REQ-003 (crm-coach-roster)
describe('CoachRoster', () => {
  beforeEach(() => fetchMock.mockReset());

  it('코치 순서대로 재원 수와 명단, 요약(중복 없는 재원 수)을 보여 준다', async () => {
    fetchMock.mockReturnValueOnce(json({ data: roster }));
    render(<CoachRoster adminKey="k" onSelectStudentById={vi.fn()} />);
    const cards = await screen.findAllByTestId('coach-card');
    expect(cards.map((c) => within(c).getByTestId('coach-name').textContent)).toEqual(['Ben', 'Julie', '배병윤']);
    expect(within(cards[0]).getByTestId('coach-active').textContent).toBe('1');
    expect(within(cards[0]).getByText('휴원 1')).toBeTruthy();
    expect(within(cards[2]).getByText('CRM 미등록')).toBeTruthy();
    expect(screen.getByTestId('roster-summary').textContent).toContain('재원 학생 2명');
    expect(screen.getByTestId('roster-summary').textContent).toContain('미배정 1명');
    expect(fetchMock).toHaveBeenCalledWith('/api/crm/coach-roster', expect.objectContaining({ headers: { 'x-admin-key': 'k' } }));
  });

  // REQ-003 (crm-coach-roster-actual)
  it('재원인데 최근 수업이 없는 학생에만 \'최근 수업 없음\'을 붙인다(휴원은 제외)', async () => {
    const stale = { ...roster, coaches: [{ ...roster.coaches[0], students: [
      { ...roster.coaches[0].students[0], recentLesson: false },
      roster.coaches[0].students[1],
    ] }] };
    fetchMock.mockReturnValueOnce(json({ data: stale }));
    render(<CoachRoster adminKey="k" onSelectStudentById={vi.fn()} />);
    const [ben] = await screen.findAllByTestId('coach-card');
    expect(within(ben).getAllByText('최근 수업 없음')).toHaveLength(1);
    expect(within(ben).getByRole('button', { name: /김주하/ }).textContent).toContain('최근 수업 없음');
    expect(within(ben).getByText('에이든').closest('li')!.textContent).not.toContain('최근 수업 없음');
  });

  it('CRM 학생을 누르면 패널을 연다(미연결 학생은 버튼이 아니다)', async () => {
    fetchMock.mockReturnValueOnce(json({ data: roster }));
    const onSelect = vi.fn();
    render(<CoachRoster adminKey="k" onSelectStudentById={onSelect} />);
    const [ben] = await screen.findAllByTestId('coach-card');
    fireEvent.click(within(ben).getByRole('button', { name: /김주하/ }));
    expect(onSelect).toHaveBeenCalledWith('crm-1');
    expect(within(ben).queryByRole('button', { name: /에이든/ })).toBeNull();
  });

  it('순서 편집 → 저장하면 CRM 코치 slug 순서를 PATCH한다', async () => {
    fetchMock.mockReturnValueOnce(json({ data: roster }))
      .mockReturnValueOnce(json({ data: { slugs: ['julie', 'ben'] } }))
      .mockReturnValueOnce(json({ data: roster }));
    render(<CoachRoster adminKey="k" onSelectStudentById={vi.fn()} />);
    await screen.findAllByTestId('coach-card');
    fireEvent.click(screen.getByRole('button', { name: '순서 편집' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ben 아래로' }));
    fireEvent.click(screen.getByRole('button', { name: '순서 저장' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/admin/coaches/order');
    expect(init).toMatchObject({ method: 'PATCH', body: JSON.stringify({ slugs: ['julie', 'ben'] }) });
  });

  it('불러오지 못하면 오류와 다시 시도 버튼', async () => {
    fetchMock.mockReturnValueOnce(json({ error: { code: 'UPSTREAM_ERROR', message: 'boom' } }, 502));
    render(<CoachRoster adminKey="k" onSelectStudentById={vi.fn()} />);
    expect(await screen.findByText(/불러오지 못했습니다/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy();
  });
});
