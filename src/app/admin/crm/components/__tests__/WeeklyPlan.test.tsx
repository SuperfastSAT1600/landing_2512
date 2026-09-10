import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WeeklyPlan } from '../WeeklyPlan';
import type { WeeklyPlanSegment } from '@/types/crm';

const TODAY = '2026-08-19T02:00:00Z'; // 26년 08월 03주차

function planResponse(segment: WeeklyPlanSegment) {
  return {
    data: {
      plan: {
        id: `p-${segment}`,
        segment,
        week_start: '2026-08-17',
        tracks: [
          {
            id: `t-${segment}`,
            name: segment === 'b2c' ? '신규리드' : '소프트웨어 판매',
            goal_text: '',
            metric: null,
            target_value: 0,
            achieved: false,
            items: [],
            carried_from_week: null,
          },
        ],
        targets: [],
        actions: [],
        focus_strategies: [],
        retrospective: { went_well: '', went_wrong: '', next_actions: [], updated_at: null },
        execution_notes: [],
        created_at: 'x',
        updated_at: 'y',
      },
      actuals: { paid: segment === 'b2c' ? 3 : 1 },
      week: { start: '2026-08-17', end: '2026-08-23', label: '26년 08월 03주차' },
      execution: [],
      prev: null,
    },
  };
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('/api/crm/weekly-plan')) {
        const segment: WeeklyPlanSegment = url.includes('segment=b2b') ? 'b2b' : 'b2c';
        return Promise.resolve({ ok: true, json: () => Promise.resolve(planResponse(segment)) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    }),
  );
});

describe('WeeklyPlan', () => {
  it('dailyView가 없으면(B2B) 주간 계획을 바로 보여준다', async () => {
    render(<WeeklyPlan segment="b2b" adminKey="k" todayISO={TODAY} />);

    // 지금까지의 버그: subView가 'today'로 고정돼 B2B 탭이 빈 화면이었다.
    await waitFor(() => expect(screen.getByText('이번 주 실행 계획')).toBeTruthy());
    expect(screen.queryByRole('button', { name: '오늘 실행' })).toBeNull();
  });

  it('dailyView가 있으면(B2C) 오늘 실행이 먼저 뜬다', async () => {
    render(
      <WeeklyPlan segment="b2c" adminKey="k" todayISO={TODAY} dailyView={<p>오늘 할 일 목록</p>} />,
    );
    expect(screen.getByText('오늘 할 일 목록')).toBeTruthy();
    expect(screen.queryByText('이번 주 실행 계획')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '주간 계획' }));
    await waitFor(() => expect(screen.getByText('이번 주 실행 계획')).toBeTruthy());
  });

  it('기본은 전체 보기라 B2C·B2B 트랙이 함께 보인다', async () => {
    render(<WeeklyPlan segment="b2c" adminKey="k" todayISO={TODAY} />);

    await waitFor(() => expect(screen.getByDisplayValue('신규리드')).toBeTruthy());
    expect(screen.getByDisplayValue('소프트웨어 판매')).toBeTruthy();
  });

  it('세그먼트 칩으로 한 쪽만 볼 수 있다', async () => {
    render(<WeeklyPlan segment="b2c" adminKey="k" todayISO={TODAY} />);
    await waitFor(() => expect(screen.getByDisplayValue('소프트웨어 판매')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'B2C' }));
    expect(screen.getByDisplayValue('신규리드')).toBeTruthy();
    expect(screen.queryByDisplayValue('소프트웨어 판매')).toBeNull();
  });

  it('회고는 현재 워크스페이스 세그먼트 것만 보여준다', async () => {
    render(<WeeklyPlan segment="b2b" adminKey="k" todayISO={TODAY} />);
    await waitFor(() => expect(screen.getByText('이 주 회고 · B2B')).toBeTruthy());
    expect(screen.queryByText('이 주 회고 · B2C')).toBeNull();
  });

  it('주 이동 버튼이 있다', async () => {
    render(<WeeklyPlan segment="b2b" adminKey="k" todayISO={TODAY} />);
    await waitFor(() => expect(screen.getByText('26년 08월 03주차')).toBeTruthy());
    expect(screen.getByLabelText('이전 주')).toBeTruthy();
    expect(screen.getByLabelText('다음 주')).toBeTruthy();
  });
});
