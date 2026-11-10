import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({ tasks: vi.fn(), contacts: vi.fn(), add: vi.fn() }));
vi.mock('../api', () => ({ workLogApi: { contactTasks: api.tasks } }));
vi.mock('../../briefing/api', () => ({ staffApi: { contacts: api.contacts, addContact: api.add, removeContact: vi.fn() } }));

import { ContactTasks } from '../components/ContactTasks';

const generatedAt = '2026-11-11T01:00:00.000Z'; // 11/11 10:00 KST
const groups = [
  { kind: 'noSchedule', title: '스터디홀/보캡 스케줄 없음', target: '학생', tasks: [{ targetId: 's1', name: '나은', remainingHours: 6 }] },
  { kind: 'coach', title: '코칭룸 미예약 학생이 있는 코치', target: '코치', tasks: [{ targetId: 'coach:ben', name: 'Ben', studentNames: ['마루'] }] },
];
const yesterday = {
  id: 'c1', studentId: 's1', studentName: '나은', contactedAt: '2026-11-10T05:00:00.000Z', staffId: 'staff-2', staffName: '신명경',
  briefingDate: '2026-11-10', listKey: 'noSchedule', note: '전화 부재중, 문자로 안내',
};

beforeEach(() => {
  vi.clearAllMocks();
  api.tasks.mockResolvedValue({ generatedAt, groups });
  api.contacts.mockResolvedValue({ s1: [yesterday] });
});

// REQ-006
describe('ContactTasks', () => {
  it('대상들의 연락 이력을 불러와 전날 근무자의 기록을 바로 보여준다', async () => {
    render(<ContactTasks refreshKey={0} staffId="staff-1" />);
    expect(await screen.findByText('최근 연락 11/10 14:00 신명경 — 전화 부재중, 문자로 안내')).toBeTruthy();
    expect(api.contacts).toHaveBeenCalledWith(['s1', 'coach:ben']);
  });

  it('결과를 적어 기록하면 오늘(KST) 날짜·그룹과 함께 저장하고 이력에 붙인다', async () => {
    const saved = { ...yesterday, id: 'c2', staffId: 'staff-1', staffName: '나', contactedAt: '2026-11-11T01:05:00.000Z', briefingDate: '2026-11-11', note: '스케줄 입력 약속' };
    api.add.mockResolvedValue(saved);
    render(<ContactTasks refreshKey={0} staffId="staff-1" />);
    await screen.findByText(/전화 부재중/);
    fireEvent.click(screen.getAllByRole('button', { name: '결과 기록' })[0]);
    fireEvent.change(screen.getByPlaceholderText('연락 결과 (예: 전화 부재중, 문자로 스케줄 안내)'), { target: { value: '스케줄 입력 약속' } });
    fireEvent.click(screen.getByRole('button', { name: '기록' }));
    await waitFor(() => expect(api.add).toHaveBeenCalledWith({
      studentId: 's1', studentName: '나은', briefingDate: '2026-11-11', listKey: 'noSchedule', note: '스케줄 입력 약속',
    }));
    expect(await screen.findByText('최근 연락 11/11 10:05 나 — 스케줄 입력 약속')).toBeTruthy();
  });
});
