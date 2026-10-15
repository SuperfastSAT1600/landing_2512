import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CoachRoomCard } from '../CoachRoomCard';
import type { CoachSubjectLedger } from '@/lib/coach-room-ledger';

const sat: CoachSubjectLedger = {
  subject: 'SAT',
  managementStatus: 'active',
  totals: { purchased: 40, refunded: 0, completed: 10.5, remaining: 29.5, scheduled: 16, unscheduled: 13.5 },
  lessons: [
    { id: 'l3', startsAt: '2026-10-16T21:00:00Z', endsAt: '2026-10-16T22:30:00Z', hours: 1.5, teacher: '박기훈', status: 'scheduled', cumulativeCompleted: null },
    { id: 'l2', startsAt: '2026-10-12T20:00:00Z', endsAt: '2026-10-12T22:00:00Z', hours: 2, teacher: '박기훈', status: 'completed', cumulativeCompleted: 10.5 },
  ],
  transactions: [{ paidAt: '2026-09-11T00:57:00Z', hours: 40, product: 'SAT > 관리형 > 1:1수업 > 40시간' }],
  refunds: [],
};

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const ok = (subjects: CoachSubjectLedger[]) => Promise.resolve(new Response(JSON.stringify({ data: { subjects } }), { status: 200 }));

// REQ-003 (crm-coach-room-card)
describe('CoachRoomCard', () => {
  beforeEach(() => fetchMock.mockReset());

  it('열리면 바로 불러와 등록·진행·잔여·예약을 보여 준다', async () => {
    fetchMock.mockReturnValue(ok([sat]));
    render(<CoachRoomCard studentId="s1" adminKey="k" />);
    await screen.findByText('SAT');
    expect(fetchMock).toHaveBeenCalledWith('/api/crm/students/s1/coach-room', expect.objectContaining({ headers: { 'x-admin-key': 'k' } }));
    expect(screen.getByTestId('coach-registered').textContent).toBe('40h');
    expect(screen.getByTestId('coach-completed').textContent).toBe('10.5h');
    expect(screen.getByTestId('coach-remaining').textContent).toBe('29.5h');
    expect(screen.getByTestId('coach-scheduled').textContent).toBe('16h');
  });

  it('수업마다 상태와 완료 누적을 보여 준다(KST)', async () => {
    fetchMock.mockReturnValue(ok([sat]));
    render(<CoachRoomCard studentId="s1" adminKey="k" />);
    await screen.findByText('SAT');
    expect(screen.getByText('예정')).toBeTruthy();
    expect(screen.getByText('누적 10.5h')).toBeTruthy();
    // 2026-10-12T20:00Z = KST 10.13 05:00
    expect(screen.getByText(/10\.13 \(화\) 05:00–07:00/)).toBeTruthy();
  });

  it('자정에 끝나는 수업은 24:00이 아니라 00:00', async () => {
    const midnight = { ...sat.lessons[1], id: 'm', startsAt: '2026-10-12T13:00:00Z', endsAt: '2026-10-12T15:00:00Z' };
    fetchMock.mockReturnValue(ok([{ ...sat, lessons: [midnight] }]));
    render(<CoachRoomCard studentId="s1" adminKey="k" />);
    expect(await screen.findByText(/10\.12 \(월\) 22:00–00:00/)).toBeTruthy();
  });

  it('200이어도 형식이 다르면 오류 상태(패널을 깨뜨리지 않음)', async () => {
    fetchMock.mockReturnValue(Promise.resolve(new Response(JSON.stringify({ data: [{ id: 's1' }] }), { status: 200 })));
    render(<CoachRoomCard studentId="s1" adminKey="k" />);
    expect(await screen.findByText('다시 시도')).toBeTruthy();
  });

  it('불러오기 실패면 다시 시도 버튼', async () => {
    fetchMock.mockReturnValue(Promise.resolve(new Response('{}', { status: 502 })));
    render(<CoachRoomCard studentId="s1" adminKey="k" />);
    expect(await screen.findByText('다시 시도')).toBeTruthy();
  });

  it('잔여가 음수면 초과 진행으로 표시', async () => {
    fetchMock.mockReturnValue(ok([{ ...sat, totals: { ...sat.totals, remaining: -2 } }]));
    render(<CoachRoomCard studentId="s1" adminKey="k" />);
    expect(await screen.findByText(/초과 진행 2h/)).toBeTruthy();
  });

  it('결제 내역은 펼쳐야 보인다', async () => {
    fetchMock.mockReturnValue(ok([sat]));
    render(<CoachRoomCard studentId="s1" adminKey="k" />);
    await screen.findByText('SAT');
    expect(screen.queryByText(/1:1수업 > 40시간/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /결제 내역/ }));
    expect(screen.getByText(/1:1수업 > 40시간/)).toBeTruthy();
  });

  it('SRM 미연결이면 안내', async () => {
    fetchMock.mockReturnValue(Promise.resolve(new Response(JSON.stringify({ error: { code: 'no_v2_profile', message: 'x' } }), { status: 404 })));
    render(<CoachRoomCard studentId="s1" adminKey="k" />);
    await waitFor(() => expect(screen.getByText(/SRM 계정이 연결되지 않았습니다/)).toBeTruthy());
  });
});
