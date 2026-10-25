import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CoachCard } from '../components/CoachCard';
import type { ContactLog } from '../types';

const now = new Date('2026-10-22T03:00:00Z');

const coach = {
  key: 'ben', name: 'Ben', studentCount: 2, scheduledHours: 6, remainingHours: 16, ratio: 37.5, deltaPp: 3.2,
  students: [
    { userId: 's1', name: '나윤진', scheduledHours: 0, remainingHours: 6, ratio: 0 },
    { userId: 's2', name: '박정연', scheduledHours: 6, remainingHours: 10, ratio: 60 },
  ],
};

const log = (over: Partial<ContactLog>): ContactLog => ({
  id: 'c1', studentId: 'coach:ben', studentName: 'Ben', contactedAt: '2026-10-20T01:00:00Z', staffId: 'staff-1', staffName: '신명경',
  briefingDate: '2026-10-20', listKey: 'coach', note: null, ...over,
});

const props = () => ({
  coach, contacts: {}, briefingDate: '2026-10-22', now, staffId: 'staff-1',
  onContact: vi.fn().mockResolvedValue(undefined), onRemove: vi.fn().mockResolvedValue(undefined),
});

const renderCard = (p = props()) => render(<ul><CoachCard {...p} /></ul>);

// REQ-005
describe('CoachCard', () => {
  it('처음에는 학생이 접혀 있고, 이름 줄에 "학생 N명 보기"가 보인다', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /학생 2명 보기/ })).toBeTruthy();
    expect(screen.queryByText('나윤진')).toBeNull();
  });

  it('코치 이름 줄을 누르면 담당 학생 현황이 펼쳐지고 다시 누르면 접힌다', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /학생 2명 보기/ }));
    expect(screen.getByText('나윤진')).toBeTruthy();
    expect(screen.getByText('예약 6h / 잔여 10h = 60%')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /학생 2명 접기/ }));
    expect(screen.queryByText('나윤진')).toBeNull();
  });

  it('코치 [연락함]은 코치 id(coach:key)로 기록하고, 펼침 상태는 바뀌지 않는다', async () => {
    const p = props();
    renderCard(p);
    fireEvent.click(within(screen.getByTestId('coach-ben')).getAllByRole('button', { name: '연락함' })[0]);
    await waitFor(() => expect(p.onContact).toHaveBeenCalledWith('coach:ben', 'Ben', 'coach', undefined));
    expect(screen.queryByText('나윤진')).toBeNull();
  });

  it('학생 [연락함]은 학생 id로 기록', async () => {
    const p = props();
    renderCard(p);
    fireEvent.click(screen.getByRole('button', { name: /학생 2명 보기/ }));
    fireEvent.click(within(screen.getByTestId('student-s2')).getByRole('button', { name: '연락함' }));
    await waitFor(() => expect(p.onContact).toHaveBeenCalledWith('s2', '박정연', 'coach', undefined));
  });

  it('코치의 마지막 연락과 이력을 보여준다', () => {
    const p = props();
    renderCard({ ...p, contacts: { 'coach:ben': [log({ note: '일정 확인 요청' })] } });
    expect(screen.getByText('마지막 연락 2일 전')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '이력 1' }));
    expect(screen.getByText('— 일정 확인 요청')).toBeTruthy();
  });

  it('비율·예약/잔여·전일 대비를 한 줄로 보여준다', () => {
    renderCard();
    expect(screen.getByText('38%')).toBeTruthy();
    expect(screen.getByText('예약 6h / 잔여 16h')).toBeTruthy();
    expect(screen.getByText('전일 대비 ▲3.2%p')).toBeTruthy();
  });
});
