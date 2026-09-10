import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WeeklyGoalEditor from '../WeeklyGoalEditor';

const ALL_GROUPS = ['네이버 SEO', '구글 SEO', 'META', '소개', 'B2B', '미분류'];

function weekRow(weekStart: string, target: number | null, actuals: Record<string, number> = {}) {
  const total = Object.values(actuals).reduce((a, b) => a + b, 0);
  return {
    week_start: weekStart,
    week_end: '2026-09-06',
    week_label: '26년 09월 01주차',
    target,
    actuals: Object.fromEntries(ALL_GROUPS.map((g) => [g, actuals[g] ?? 0])),
    actual_total: total,
    achievement_rate: target ? Math.round((total / target) * 100) : null,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;
let rowsByWeek: Record<string, ReturnType<typeof weekRow>>;

function mountEditor(onSaved = vi.fn(), onSnapshot = vi.fn()) {
  return render(
    <WeeklyGoalEditor
      adminKey="admin-key"
      currentWeekStart="2026-08-31"
      onSaved={onSaved}
      onSnapshot={onSnapshot}
    />
  );
}

const targetInput = () => screen.getByLabelText('주차 목표 리드 수') as HTMLInputElement;
const badge = () => screen.getByTestId('week-offset-badge').textContent;

function saveCalls() {
  return fetchMock.mock.calls
    .filter(([url, init]) => String(url).includes('/api/crm/marketing/goals') && init?.method)
    .map(([url, init]) => ({
      url: String(url),
      method: init.method as string,
      body: init.body ? JSON.parse(init.body as string) : null,
    }));
}

beforeEach(() => {
  rowsByWeek = {
    '2026-08-31': weekRow('2026-08-31', 20, { META: 4, '구글 SEO': 2 }),
    '2026-08-24': weekRow('2026-08-24', 15, { META: 9 }),
    '2026-08-17': weekRow('2026-08-17', null, {}),
    '2026-09-07': weekRow('2026-09-07', null, {}),
  };
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method) return { ok: true, json: async () => ({ data: {} }) };
    const week = new URL(String(url), 'http://localhost').searchParams.get('week_start')!;
    return { ok: true, json: async () => ({ data: { weeks: [rowsByWeek[week]] } }) };
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('alert', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

// REQ-008: 주차별 총합 목표 편집기 — 이번 주/지난주 구분이 핵심
describe('WeeklyGoalEditor — 주차 구분', () => {
  it('이번 주로 열리고 "이번 주" 배지를 붙인다', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    expect(badge()).toBe('이번 주');
  });

  it('주차 라벨을 "몇월 몇주차" 형식으로 보여준다', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    expect(screen.getByTestId('week-label').textContent).toBe('26년 09월 01주차');
  });

  it('◀ 를 누르면 지난주 목표로 교체된다', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    fireEvent.click(screen.getByRole('button', { name: '이전 주차' }));
    await waitFor(() => expect(targetInput().value).toBe('15'));
    expect(badge()).toBe('지난주');
  });

  it('▶ 를 누르면 "다음 주" 배지가 되고 빈 값으로 시작한다', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    fireEvent.click(screen.getByRole('button', { name: '다음 주차' }));
    await waitFor(() => expect(badge()).toBe('다음 주'));
    expect(targetInput().value).toBe('');
  });

  it('두 주 이상 과거는 "N주 전"으로 표시한다', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    fireEvent.click(screen.getByRole('button', { name: '이전 주차' }));
    await waitFor(() => expect(badge()).toBe('지난주'));
    fireEvent.click(screen.getByRole('button', { name: '이전 주차' }));
    await waitFor(() => expect(badge()).toBe('2주 전'));
  });

  it('읽어온 주차 데이터를 상위에 올린다 (소스 구성표 동기화)', async () => {
    const onSnapshot = vi.fn();
    mountEditor(vi.fn(), onSnapshot);
    await waitFor(() =>
      expect(onSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ week_start: '2026-08-31', target: 20 })
      )
    );

    fireEvent.click(screen.getByRole('button', { name: '이전 주차' }));
    await waitFor(() =>
      expect(onSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ week_start: '2026-08-24', target: 15 })
      )
    );
  });

  it('주차 전환 중에는 null 을 올려 이전 주차 데이터가 남지 않게 한다', async () => {
    const onSnapshot = vi.fn();
    mountEditor(vi.fn(), onSnapshot);
    await waitFor(() => expect(targetInput().value).toBe('20'));

    onSnapshot.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '이전 주차' }));
    expect(onSnapshot).toHaveBeenCalledWith(null);
  });

  it('새 주차 데이터가 오기 전에 이전 주차 값을 지운다', async () => {
    let release: (() => void) | null = null;
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method) return { ok: true, json: async () => ({ data: {} }) };
      const week = new URL(String(url), 'http://localhost').searchParams.get('week_start')!;
      if (week === '2026-08-24') await new Promise<void>((r) => { release = r; });
      return { ok: true, json: async () => ({ data: { weeks: [rowsByWeek[week]] } }) };
    });

    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    fireEvent.click(screen.getByRole('button', { name: '이전 주차' }));
    await waitFor(() => expect(badge()).toBe('지난주'));
    expect(targetInput().value).toBe('');

    release!();
    await waitFor(() => expect(targetInput().value).toBe('15'));
  });

  it('늦게 도착한 이전 주차 응답이 현재 화면을 덮지 않는다', async () => {
    let release: (() => void) | null = null;
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method) return { ok: true, json: async () => ({ data: {} }) };
      const week = new URL(String(url), 'http://localhost').searchParams.get('week_start')!;
      if (week === '2026-08-24') await new Promise<void>((r) => { release = r; });
      return { ok: true, json: async () => ({ data: { weeks: [rowsByWeek[week]] } }) };
    });

    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    fireEvent.click(screen.getByRole('button', { name: '이전 주차' }));
    await waitFor(() => expect(badge()).toBe('지난주'));
    fireEvent.click(screen.getByRole('button', { name: '다음 주차' }));
    await waitFor(() => expect(targetInput().value).toBe('20'));

    release!();
    await new Promise((r) => setTimeout(r, 50));
    expect(badge()).toBe('이번 주');
    expect(targetInput().value).toBe('20');
  });
});

describe('WeeklyGoalEditor — 실적·달성률', () => {
  it('해당 주차 실적 총계를 보여준다', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    expect(screen.getByTestId('actual-total').textContent).toContain('6');
  });

  it('입력값 기준으로 달성률을 즉시 계산한다', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    expect(screen.getByTestId('achievement-rate').textContent).toBe('30%'); // 6/20

    fireEvent.change(targetInput(), { target: { value: '6' } });
    expect(screen.getByTestId('achievement-rate').textContent).toBe('100%');
  });

  it('목표를 비우면 달성률은 계산하지 않는다', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    fireEvent.change(targetInput(), { target: { value: '' } });
    expect(screen.getByTestId('achievement-rate').textContent).toBe('—');
  });

  it('목표 0 도 달성률을 계산하지 않는다 (0 나눗셈 방지)', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    fireEvent.change(targetInput(), { target: { value: '0' } });
    expect(screen.getByTestId('achievement-rate').textContent).toBe('—');
  });

  it('소스별 목표 입력은 없다', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    for (const g of ALL_GROUPS) {
      expect(screen.queryByLabelText(`${g} 목표`)).toBeNull();
    }
  });
});

describe('WeeklyGoalEditor — 저장', () => {
  it('변경이 없으면 저장 버튼이 비활성이다', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('목표를 PUT 한다', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    fireEvent.change(targetInput(), { target: { value: '31' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(saveCalls()).toHaveLength(1));
    expect(saveCalls()[0]).toMatchObject({
      method: 'PUT',
      body: { week_start: '2026-08-31', target_count: 31 },
    });
  });

  it('비우고 저장하면 DELETE 한다 (미설정 복귀)', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    fireEvent.change(targetInput(), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(saveCalls()).toHaveLength(1));
    expect(saveCalls()[0].method).toBe('DELETE');
    expect(saveCalls()[0].url).toContain('week_start=2026-08-31');
  });

  it('0 은 삭제가 아니라 0 으로 저장한다', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    fireEvent.change(targetInput(), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(saveCalls()).toHaveLength(1));
    expect(saveCalls()[0]).toMatchObject({ method: 'PUT', body: { target_count: 0 } });
  });

  it('보고 있던 주차에 저장한다 (이번 주로 튀지 않음)', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    fireEvent.click(screen.getByRole('button', { name: '이전 주차' }));
    await waitFor(() => expect(targetInput().value).toBe('15'));

    fireEvent.change(targetInput(), { target: { value: '17' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(saveCalls()).toHaveLength(1));
    expect(saveCalls()[0].body).toMatchObject({ week_start: '2026-08-24', target_count: 17 });
    await waitFor(() => expect(badge()).toBe('지난주'));
  });

  it('저장 후 onSaved 를 호출한다', async () => {
    const onSaved = vi.fn();
    mountEditor(onSaved);
    await waitFor(() => expect(targetInput().value).toBe('20'));
    fireEvent.change(targetInput(), { target: { value: '31' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('저장 실패는 alert 로 알린다', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method) return { ok: false, json: async () => ({ error: '목표 저장에 실패했습니다.' }) };
      const week = new URL(String(url), 'http://localhost').searchParams.get('week_start')!;
      return { ok: true, json: async () => ({ data: { weeks: [rowsByWeek[week]] } }) };
    });
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    fireEvent.change(targetInput(), { target: { value: '31' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith('목표 저장에 실패했습니다.'));
  });

  it('관리자 키를 헤더로 보낸다', async () => {
    mountEditor();
    await waitFor(() => expect(targetInput().value).toBe('20'));
    fireEvent.change(targetInput(), { target: { value: '31' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(saveCalls()).toHaveLength(1));
    const headers = fetchMock.mock.calls.at(-1)![1].headers as Record<string, string>;
    expect(headers['x-admin-key']).toBe('admin-key');
  });
});
