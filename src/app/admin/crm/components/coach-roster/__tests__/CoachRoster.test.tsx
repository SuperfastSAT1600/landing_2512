import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CoachRoster } from '../CoachRoster';
import type { CoachRoster as Roster } from '@/lib/coach-roster';

const roster: Roster = {
  coaches: [
    {
      key: 'ben', slug: 'ben', name: 'Ben', subjects: ['SAT', 'AP'], linked: true, registered: true, activeCount: 1, onboardingCount: 0, pausedCount: 1,
      students: [
        { profileId: 'p1', crmStudentId: 'crm-1', name: '김주하', status: 'active', subjects: [{ subject: 'SAT', status: 'active' }] },
        { profileId: 'p2', crmStudentId: null, name: '에이든', status: 'paused', subjects: [{ subject: 'SAT', status: 'paused' }] },
      ],
    },
    { key: 'julie', slug: 'julie', name: 'Julie', subjects: ['SAT'], linked: true, registered: true, activeCount: 0, onboardingCount: 0, pausedCount: 0, students: [] },
    { key: 'v2:t9', slug: null, name: '배병윤', subjects: [], linked: true, registered: false, activeCount: 1, onboardingCount: 0, pausedCount: 0,
      students: [{ profileId: 'p1', crmStudentId: 'crm-1', name: '김주하', status: 'active', subjects: [{ subject: 'SAT', status: 'active' }] }] },
  ],
  unassigned: [{ profileId: 'p3', crmStudentId: 'crm-3', name: '조유인', status: 'active', subjects: [] }],
};

// 오른쪽 매칭 정리 패널은 따로 테스트(MatchingCleanupPanel.test.tsx) — 여기서는 목록 fetch만 본다
vi.mock('../MatchingCleanupPanel', () => ({ MatchingCleanupPanel: () => null }));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

// REQ-003 (crm-coach-roster)
describe('CoachRoster', () => {
  beforeEach(() => fetchMock.mockReset());

  it('미배정 맨 위, 그 아래 SAT 가능 · AP 가능 코치를 좌우 칸에 직접 정한 순서로, 과목 없는 코치는 과목 미지정 칸', async () => {
    fetchMock.mockReturnValueOnce(json({ data: roster }));
    render(<CoachRoster adminKey="k" onSelectStudentById={vi.fn()} />);
    const names = (testId: string) => within(screen.getByTestId(testId)).getAllByTestId('coach-name').map((n) => n.textContent);
    await screen.findAllByTestId('coach-card');
    // 둘 다 가능한 Ben은 양쪽에, Julie(0명)는 학생 수와 상관없이 정한 순서 그대로
    expect(names('subject-col-SAT')).toEqual(['Ben', 'Julie']);
    expect(names('subject-col-AP')).toEqual(['Ben']);
    expect(names('subject-col-none')).toEqual(['배병윤']);
    expect(within(screen.getByTestId('subject-col-SAT')).getByText('SAT 가능 코치')).toBeTruthy();
    expect(within(screen.getByTestId('subject-col-SAT')).getByTestId('subject-col-count').textContent).toBe('2');
    expect(within(screen.getByTestId('subject-col-AP')).getByTestId('subject-col-count').textContent).toBe('1');
    const ben = within(screen.getByTestId('subject-col-SAT')).getAllByTestId('coach-card')[0];
    expect(within(ben).getByTestId('coach-active').textContent).toBe('1');
    expect(within(ben).queryByText('김주하')).toBeNull();
    expect(within(screen.getByTestId('subject-col-none')).getByText('CRM 미등록')).toBeTruthy();
    // 미배정 줄이 맨 위
    const unassigned = screen.getByTestId('unassigned-row');
    expect(unassigned.compareDocumentPosition(screen.getByTestId('subject-col-SAT')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId('roster-summary').textContent).toContain('재원 학생 2명');
    expect(screen.getByTestId('roster-summary').textContent).toContain('미배정 1명');
    expect(fetchMock).toHaveBeenCalledWith('/api/crm/coach-roster', expect.objectContaining({ headers: { 'x-admin-key': 'k' } }));
  });

  it('가능 과목이 없는 코치가 없으면 과목 미지정 칸을 그리지 않는다', async () => {
    fetchMock.mockReturnValueOnce(json({ data: { ...roster, coaches: roster.coaches.slice(0, 2) } }));
    render(<CoachRoster adminKey="k" onSelectStudentById={vi.fn()} />);
    await screen.findAllByTestId('coach-card');
    expect(screen.queryByTestId('subject-col-none')).toBeNull();
  });

  it('CRM 학생을 누르면 패널을 연다(미연결 학생은 버튼이 아니다)', async () => {
    fetchMock.mockReturnValueOnce(json({ data: roster }));
    const onSelect = vi.fn();
    render(<CoachRoster adminKey="k" onSelectStudentById={onSelect} />);
    const [ben] = await screen.findAllByTestId('coach-card');
    fireEvent.click(within(ben).getByRole('button', { name: /Ben/ }));
    fireEvent.click(within(ben).getByRole('button', { name: /김주하/ }));
    expect(onSelect).toHaveBeenCalledWith('crm-1');
    expect(within(ben).queryByRole('button', { name: /에이든/ })).toBeNull();
  });

  // REQ-001 (crm-coach-roster-accordion)
  it('코치 줄은 접혀 있고, 누르면 담당 학생 명단이 펼쳐졌다가 다시 누르면 접힌다', async () => {
    fetchMock.mockReturnValueOnce(json({ data: roster }));
    render(<CoachRoster adminKey="k" onSelectStudentById={vi.fn()} />);
    const [ben] = await screen.findAllByTestId('coach-card');
    const header = within(ben).getByRole('button', { name: /Ben/ });
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(within(ben).queryByText('에이든')).toBeNull();
    fireEvent.click(header);
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(within(ben).getByText('에이든')).toBeTruthy();
    fireEvent.click(header);
    expect(within(ben).queryByText('에이든')).toBeNull();
  });

  it('코치 미배정도 접힌 줄로 두고, 누르면 명단을 보여 준다', async () => {
    fetchMock.mockReturnValueOnce(json({ data: roster }));
    render(<CoachRoster adminKey="k" onSelectStudentById={vi.fn()} />);
    const row = await screen.findByTestId('unassigned-row');
    expect(within(row).getByTestId('unassigned-count').textContent).toBe('1');
    expect(within(row).queryByText('조유인')).toBeNull();
    fireEvent.click(within(row).getByRole('button', { name: /코치 미배정/ }));
    expect(within(row).getByText('조유인')).toBeTruthy();
  });

  it('순서 편집 → 저장하면 CRM 코치 slug 순서를 PATCH한다', async () => {
    fetchMock.mockReturnValueOnce(json({ data: roster }))
      .mockReturnValueOnce(json({ data: { slugs: ['julie', 'ben'] } }))
      .mockReturnValueOnce(json({ data: roster }));
    render(<CoachRoster adminKey="k" onSelectStudentById={vi.fn()} />);
    await screen.findAllByTestId('coach-card');
    expect(screen.getByRole('button', { name: '순서 편집' }).getAttribute('title')).toBe('코치 목록에 보일 순서');
    fireEvent.click(screen.getByRole('button', { name: '순서 편집' }));
    expect(screen.getByText(/이 순서대로 목록에 보입니다/)).toBeTruthy();
    expect(screen.queryByText(/담당 학생 수가 같은 코치끼리/)).toBeNull();
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
