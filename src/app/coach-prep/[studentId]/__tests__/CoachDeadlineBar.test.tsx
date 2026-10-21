// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CoachDeadlineBar } from '../CoachDeadlineBar';
import type { CoachRequestInfo } from '@/types/coach-prep';

const info = (over: Partial<CoachRequestInfo> = {}): CoachRequestInfo => ({
  token: 't'.repeat(32), coach_name: '김혜지', created_at: '2026-10-20T00:00:00Z', deadline_at: '2026-10-21T00:00:00Z',
  status: 'pending', first_lesson_at: null, second_lesson_at: null, option2_first_lesson_at: null, option2_second_lesson_at: null,
  decline_reason: null, ...over,
});

describe('CoachDeadlineBar', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true }))); });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  // REQ-004
  it('마감 전에는 남은 시간·진행 바·응답 버튼을 보여주고 열람을 기록한다', () => {
    vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
    render(<CoachDeadlineBar info={info()} unlocked />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByText('12시간 0분 남음')).toBeTruthy();
    expect(screen.getByRole('link', { name: '응답하기' }).getAttribute('href')).toBe('#coach-response');
    expect(fetch).toHaveBeenCalledWith('/api/coach-prep/opened', expect.objectContaining({ method: 'POST' }));
  });

  it('이미 응답했으면 버튼이 "응답 수정"이다', () => {
    vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
    render(<CoachDeadlineBar info={info({ status: 'declined' })} unlocked />);
    expect(screen.getByRole('link', { name: '응답 수정' })).toBeTruthy();
  });

  it('마감이 지나면 가득 찬 바와 마감 문구만 보이고 응답 버튼은 없다', () => {
    vi.setSystemTime(new Date('2026-10-22T00:00:00Z'));
    render(<CoachDeadlineBar info={info()} unlocked />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    expect(screen.getByText('응답이 마감되었습니다')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('필수 확인 전에는 버튼이 아직 없는 응답 폼이 아니라 필수 확인 영역으로 안내한다', () => {
    vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
    render(<CoachDeadlineBar info={info()} unlocked={false} />);
    expect(screen.getByRole('link', { name: '필수 확인하기' }).getAttribute('href')).toBe('#confirm');
  });

  it('마감 6시간 안쪽이면 진행 바가 빨간색이다', () => {
    vi.setSystemTime(new Date('2026-10-20T20:00:00Z'));
    render(<CoachDeadlineBar info={info()} unlocked />);
    expect(screen.getByRole('progressbar').firstElementChild?.className).toContain('bg-red-500');
  });
});
