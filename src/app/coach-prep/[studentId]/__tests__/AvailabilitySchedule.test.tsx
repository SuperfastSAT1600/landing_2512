import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvailabilitySchedule } from '../AvailabilitySchedule';
import type { AvailabilitySummary } from '@/lib/student-availability';

const occ = (dateKst: string, weekdayKst: number, start: string, end: string, dateLocal: string, weekdayLocal: number) => ({
  dateKst, weekdayKst, start, end, dateLocal, weekdayLocal, startLocal: '19:00', endLocal: '21:00', notes: null,
});

const summary = (upcoming: AvailabilitySummary['upcoming']): AvailabilitySummary => ({
  studentTz: 'America/New_York (EST, UTC-5)', blocks: [], upcoming,
});

describe('AvailabilitySchedule — 날짜 중심 표시', () => {
  it('REQ-003: 날짜(요일)를 앞세워 날짜순으로 보여 주고 학생 현지 날짜를 병기한다', () => {
    render(<AvailabilitySchedule availability={summary([
      occ('2026-11-10', 1, '09:00', '11:00', '2026-11-09', 0),
      occ('2026-11-11', 2, '09:00', '11:00', '2026-11-10', 1),
    ])} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items[0]).toContain('11/10(화)');
    expect(items[0]).toContain('09:00 ~ 11:00');
    expect(items[0]).toContain('학생 현지 11/09(월) 19:00 ~ 21:00');
    expect(items[1]).toContain('11/11(수)');
  });

  it('REQ-003: 14일 안에 가능 날짜가 없으면 안내 문구', () => {
    render(<AvailabilitySchedule availability={summary([])} />);
    expect(screen.getByText(/앞으로 14일 안에/)).toBeTruthy();
  });
});
