import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StudentRow } from '../components/StudentRow';
import type { ContactLog } from '../types';

const now = new Date('2026-10-22T03:00:00Z'); // 10/22 12:00 KST

const log = (over: Partial<ContactLog>): ContactLog => ({
  id: 'c1', studentId: 's1', studentName: '학생', contactedAt: '2026-10-19T01:00:00Z', staffId: 'staff-1', staffName: '신명경',
  briefingDate: '2026-10-19', listKey: 'noSchedule', note: null, ...over,
});

const base = {
  studentId: 's1', name: '학생', briefingDate: '2026-10-22', now, staffId: 'staff-1',
  onContact: vi.fn().mockResolvedValue(undefined), onRemove: vi.fn().mockResolvedValue(undefined),
};

// REQ-005
describe('StudentRow', () => {
  it('연락 기록이 없으면 안내 문구', () => {
    render(<StudentRow {...base} contacts={[]} />);
    expect(screen.getByText('연락 기록 없음')).toBeTruthy();
  });

  it('가장 최근 연락이 며칠 전인지 보여준다', () => {
    render(<StudentRow {...base} contacts={[log({}), log({ id: 'c0', contactedAt: '2026-10-01T01:00:00Z' })]} />);
    expect(screen.getByText('마지막 연락 3일 전')).toBeTruthy();
  });

  it('보고 있는 날짜에 연락한 학생은 체크 표시', () => {
    render(<StudentRow {...base} contacts={[log({ briefingDate: '2026-10-22', contactedAt: '2026-10-22T01:00:00Z' })]} />);
    expect(screen.getByText('✓ 연락함 1')).toBeTruthy();
  });

  it('연락함 버튼은 한 번 누르면 바로 기록', async () => {
    const onContact = vi.fn().mockResolvedValue(undefined);
    render(<StudentRow {...base} onContact={onContact} contacts={[]} />);
    fireEvent.click(screen.getByRole('button', { name: '연락함' }));
    await waitFor(() => expect(onContact).toHaveBeenCalledWith());
  });

  it('이력을 펼치면 날짜·시각·직원·메모가 보이고 메모와 함께 기록할 수 있다', async () => {
    const onContact = vi.fn().mockResolvedValue(undefined);
    render(<StudentRow {...base} onContact={onContact} contacts={[log({ note: '문자 발송' })]} />);
    fireEvent.click(screen.getByRole('button', { name: '이력 1' }));
    expect(screen.getByText('10/19 10:00')).toBeTruthy();
    expect(screen.getByText('신명경')).toBeTruthy();
    expect(screen.getByText('— 문자 발송')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('메모와 함께 기록 (선택)'), { target: { value: '전화 부재중' } });
    fireEvent.click(screen.getByRole('button', { name: '기록' }));
    await waitFor(() => expect(onContact).toHaveBeenCalledWith('전화 부재중'));
  });

  it('취소 버튼은 본인이 오늘 남긴 기록에만', () => {
    const today = log({ id: 'c2', contactedAt: '2026-10-22T01:00:00Z', briefingDate: '2026-10-22' });
    const others = log({ id: 'c3', staffId: 'staff-2', contactedAt: '2026-10-22T01:30:00Z', briefingDate: '2026-10-22' });
    render(<StudentRow {...base} contacts={[others, today, log({})]} />);
    fireEvent.click(screen.getByRole('button', { name: '이력 3' }));
    expect(screen.getAllByRole('button', { name: '취소' })).toHaveLength(1);
  });

  it('저장에 실패하면 오류 문구를 보여준다', async () => {
    render(<StudentRow {...base} onContact={vi.fn().mockRejectedValue(new Error('저장 실패'))} contacts={[]} />);
    fireEvent.click(screen.getByRole('button', { name: '연락함' }));
    expect((await screen.findByRole('alert')).textContent).toBe('저장 실패');
  });
});
