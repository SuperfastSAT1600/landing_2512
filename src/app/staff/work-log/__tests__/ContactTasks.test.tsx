import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const api = vi.hoisted(() => ({ tasks: vi.fn(), contacts: vi.fn(), add: vi.fn(), workItems: vi.fn(), dismiss: vi.fn(), restore: vi.fn() }));
vi.mock('../api', () => ({ workLogApi: { contactTasks: api.tasks, studentWorkItems: api.workItems, dismiss: api.dismiss, restore: api.restore } }));
vi.mock('../../briefing/api', () => ({ staffApi: { contacts: api.contacts, addContact: api.add, removeContact: vi.fn() } }));

import { ContactTasks } from '../components/ContactTasks';

const generatedAt = '2026-11-11T01:00:00.000Z'; // 11/11 10:00 KST
const tasks = {
  generatedAt,
  students: [
    { studentId: 's1', name: '나은', remainingHours: 6, reasons: [{ kind: 'coachRoom', coachNames: ['Ben'] }, { kind: 'noSchedule' }] },
    { studentId: 's2', name: '다인', remainingHours: 3, reasons: [{ kind: 'neverScheduled', isNew: true }] },
  ],
  coaches: [{ targetId: 'coach:ben', name: 'Ben', studentNames: ['나은'] }],
};
const yesterday = {
  id: 'c1', studentId: 's1', studentName: '나은', contactedAt: '2026-11-10T05:00:00.000Z', staffId: 'staff-2', staffName: '알바A',
  briefingDate: '2026-11-10', listKey: 'noSchedule', note: '전화 부재중, 문자로 안내',
};
const row = (id: string) => screen.findByTestId(`student-${id}`);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-11T01:10:00.000Z'));
  api.tasks.mockResolvedValue(tasks);
  api.contacts.mockResolvedValue({ s1: [yesterday] });
  api.workItems.mockResolvedValue({});
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => vi.useRealTimers());

// REQ-008
describe('ContactTasks (수업 관리 업무)', () => {
  it('학생마다 한 줄에 해당 용건을 모두 보여주고, 최근 연락의 용건·결과를 보여준다', async () => {
    render(<ContactTasks refreshKey={0} staffId="staff-1" />);
    const s1 = within(await row('s1'));
    expect(s1.getByText('코칭룸 미예약 · 코치 Ben')).toBeTruthy();
    expect(s1.getByText('스터디홀/보캡 없음')).toBeTruthy();
    expect(s1.getByText('최근 연락 11/10 14:00 알바A · 스터디홀/보캡 없음 — 전화 부재중, 문자로 안내')).toBeTruthy();
    expect(api.contacts).toHaveBeenCalledWith(['s1', 's2', 'coach:ben']);
    expect(api.workItems).toHaveBeenCalledWith(['s1', 's2']);
  });

  it('용건으로 학생을 거를 수 있다', async () => {
    render(<ContactTasks refreshKey={0} staffId="staff-1" />);
    await row('s1');
    expect(screen.getByRole('button', { name: '전체 2' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '한 번도 안 잡음 1' }));
    expect(screen.queryByTestId('student-s1')).toBeNull();
    expect(screen.getByTestId('student-s2')).toBeTruthy();
  });

  it('결과를 적을 때 용건을 골라 오늘 날짜와 함께 기록하고, 그 용건에 오늘 연락 표시를 한다', async () => {
    const saved = { ...yesterday, id: 'c2', staffId: 'staff-1', staffName: '나', contactedAt: '2026-11-11T01:05:00.000Z', briefingDate: '2026-11-11', listKey: 'coachRoom', note: '목요일 코칭룸 예약 약속' };
    api.add.mockResolvedValue(saved);
    render(<ContactTasks refreshKey={0} staffId="staff-1" />);
    const s1 = within(await row('s1'));
    fireEvent.click(s1.getByRole('button', { name: '결과 기록' }));
    expect((s1.getByLabelText('용건') as HTMLSelectElement).value).toBe('coachRoom');
    fireEvent.change(s1.getByPlaceholderText('연락 결과 (예: 전화 부재중, 문자로 스케줄 안내)'), { target: { value: '목요일 코칭룸 예약 약속' } });
    fireEvent.click(s1.getByRole('button', { name: '기록' }));
    await waitFor(() => expect(api.add).toHaveBeenCalledWith({
      studentId: 's1', studentName: '나은', briefingDate: '2026-11-11', listKey: 'coachRoom', note: '목요일 코칭룸 예약 약속',
    }));
    expect(await s1.findByText('✓ 코칭룸 미예약 · 코치 Ben')).toBeTruthy();
  });

  it('용건으로 기타를 고를 수 있다', async () => {
    api.add.mockResolvedValue({ ...yesterday, id: 'c3', listKey: 'other' });
    render(<ContactTasks refreshKey={0} staffId="staff-1" />);
    const s2 = within(await row('s2'));
    fireEvent.click(s2.getByRole('button', { name: '결과 기록' }));
    fireEvent.change(s2.getByLabelText('용건'), { target: { value: 'other' } });
    fireEvent.change(s2.getByPlaceholderText('연락 결과 (예: 전화 부재중, 문자로 스케줄 안내)'), { target: { value: '수강료 문의 답변' } });
    fireEvent.click(s2.getByRole('button', { name: '기록' }));
    await waitFor(() => expect(api.add).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's2', listKey: 'other' })));
  });

  it('학생이 지정된 운영 할 일을 같은 줄에 보여준다', async () => {
    api.workItems.mockResolvedValue({ s1: [{
      messageTs: '1794200000.000100', postedAt: '2026-11-11T04:20:00.000Z', text: '학생 통화함. 목요일 코칭룸 예약 예정',
      authorName: '직원A', done: true, doneBy: '직원A', permalink: 'https://slack.com/archives/C0C9B0DEGDN/p1794200000000100', replyCount: 2,
    }] });
    render(<ContactTasks refreshKey={0} staffId="staff-1" />);
    const s1 = within(await row('s1'));
    expect(await s1.findByText('학생 통화함. 목요일 코칭룸 예약 예정')).toBeTruthy();
    expect(s1.getByText('운영 할 일 11/11 13:20 직원A · 완료 · 답글 2')).toBeTruthy();
  });

  it('코치는 따로 모아 코치 연락으로 기록한다', async () => {
    api.add.mockResolvedValue({ ...yesterday, id: 'c4', studentId: 'coach:ben', listKey: 'coach' });
    render(<ContactTasks refreshKey={0} staffId="staff-1" />);
    const ben = within(await row('coach:ben'));
    expect(ben.getByText('미예약 학생 1명: 나은')).toBeTruthy();
    fireEvent.click(ben.getByRole('button', { name: '결과 기록' }));
    fireEvent.change(ben.getByPlaceholderText('연락 결과 (예: 전화 부재중, 문자로 스케줄 안내)'), { target: { value: '학생에게 예약 안내 부탁' } });
    fireEvent.click(ben.getByRole('button', { name: '기록' }));
    await waitFor(() => expect(api.add).toHaveBeenCalledWith(expect.objectContaining({ studentId: 'coach:ben', studentName: 'Ben', listKey: 'coach' })));
  });
});

// REQ-009
describe('ContactTasks 삭제', () => {
  it('확인을 거쳐 학생을 삭제하면 목록에서 빠지고 삭제한 대상에서 복구할 수 있다', async () => {
    api.dismiss.mockResolvedValue({ name: '나은', by: '알바B', at: '2026-11-11T01:09:00.000Z' });
    render(<ContactTasks refreshKey={0} staffId="staff-1" />);
    fireEvent.click(within(await row('s1')).getByRole('button', { name: '삭제' }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(api.dismiss).toHaveBeenCalledWith('contact', 's1', '나은'));
    await waitFor(() => expect(screen.queryByTestId('student-s1')).toBeNull());
    expect(screen.getByRole('button', { name: '전체 1' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '삭제한 대상 1' }));
    expect(screen.getByText('나은 · 11/11 10:09 알바B 삭제')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '복구' }));
    await waitFor(() => expect(api.restore).toHaveBeenCalledWith('contact', 's1'));
    expect(await row('s1')).toBeTruthy();
  });

  it('확인을 취소하면 삭제하지 않는다', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<ContactTasks refreshKey={0} staffId="staff-1" />);
    fireEvent.click(within(await row('coach:ben')).getByRole('button', { name: '삭제' }));
    expect(api.dismiss).not.toHaveBeenCalled();
    expect(screen.getByTestId('student-coach:ben')).toBeTruthy();
  });

  it('이미 삭제한 대상은 처음부터 목록에서 뺀다', async () => {
    api.tasks.mockResolvedValue({ ...tasks, dismissed: { 'coach:ben': { name: 'Ben', by: '직원A', at: '2026-11-10T01:00:00.000Z' } } });
    render(<ContactTasks refreshKey={0} staffId="staff-1" />);
    await row('s1');
    expect(screen.queryByTestId('student-coach:ben')).toBeNull();
    expect(screen.getByRole('button', { name: '삭제한 대상 1' })).toBeTruthy();
  });
});
