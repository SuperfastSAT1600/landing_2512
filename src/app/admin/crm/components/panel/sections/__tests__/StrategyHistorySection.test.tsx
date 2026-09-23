/// <reference types="vitest/globals" />
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StrategyHistorySection } from '../StrategyHistorySection';
import type { Student, StrategyHistoryEntry } from '@/types/crm';

const ENTRY: StrategyHistoryEntry = {
  id: 'h1',
  strategy_id: 's-live',
  strategy_name: '옛날 이름(스냅샷)',
  memo: '',
  applied_at: '2026-08-01T00:00:00Z',
};

const STUDENT = { id: 'stu-1', lead_type: null, strategy_history: [ENTRY] } as unknown as Student;

/** /retry-strategies와 /strategy-categories 요청을 URL로 구분해 각각 다른 데이터를 준다. */
function mockFetch(strategies: unknown[], categories: unknown[] = []) {
  global.fetch = vi.fn((url: string) => {
    const data = String(url).includes('/strategy-categories') ? categories : strategies;
    return Promise.resolve({ json: () => Promise.resolve({ data }) });
  }) as unknown as typeof fetch;
}

async function openSection(headerText: string) {
  fireEvent.click(screen.getByText('전략 히스토리'));
  fireEvent.click(await screen.findByText(headerText));
}

describe('StrategyHistorySection', () => {
  it('전략이 라이브러리에서 개명되면 히스토리 항목도 최신 이름을 보여준다', async () => {
    mockFetch(
      [{ id: 's-live', name: '새 이름(라이브)', category_id: 'cat-1' }],
      [{ id: 'cat-1', name: '컨택 전략', sort_order: 0 }]
    );
    render(<StrategyHistorySection student={STUDENT} adminKey="k" onUpdate={vi.fn()} />);

    await openSection('컨택 전략');

    expect(await screen.findByText('새 이름(라이브)')).toBeTruthy();
    expect(screen.queryByText('옛날 이름(스냅샷)')).toBeNull();
  });

  it('전략이 삭제되었으면 스냅샷 이름으로 "분류 없음" 그룹에 남는다 — 기록을 잃지 않는다', async () => {
    mockFetch([], [{ id: 'cat-1', name: '컨택 전략', sort_order: 0 }]);
    render(<StrategyHistorySection student={STUDENT} adminKey="k" onUpdate={vi.fn()} />);

    await openSection('분류 없음');

    expect(await screen.findByText('옛날 이름(스냅샷)')).toBeTruthy();
  });

  it('전략 라이브러리에서 카테고리 이름을 바꾸면 섹션 제목도 즉시 바뀐다', async () => {
    mockFetch(
      [{ id: 's-live', name: '개인화 메시지', category_id: 'cat-1' }],
      [{ id: 'cat-1', name: '컨택 전략', sort_order: 0 }] // 라이브러리에서 개명된 상태
    );
    render(<StrategyHistorySection student={STUDENT} adminKey="k" onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByText('전략 히스토리'));
    expect(await screen.findByText('컨택 전략')).toBeTruthy();
    expect(screen.queryByText('최초 컨텍 전략')).toBeNull();
  });
});

describe('StrategyHistorySection — 진행 전/후 슬롯', () => {
  const STRATS = [
    { id: 's-a', name: '진단 없이 결제 유도', kind: 'initial_sales', category_id: 'cat-1' },
    { id: 's-b', name: '연락처 받아 직접 진단', kind: 'initial_sales', category_id: 'cat-1' },
  ];
  const CATS = [{ id: 'cat-1', name: '첫 세일즈콜', sort_order: 0 }];

  function renderWith(history: StrategyHistoryEntry[]) {
    mockFetch(STRATS, CATS);
    const student = { id: 'stu-1', lead_type: null, strategy_history: history } as unknown as Student;
    render(<StrategyHistorySection student={student} adminKey="k" onUpdate={vi.fn()} />);
  }

  it('두 슬롯을 모두 보여준다 — 빈 슬롯은 기록 버튼', async () => {
    renderWith([{ ...ENTRY, strategy_id: 's-a', phase: 'planned' }]);
    await openSection('첫 세일즈콜');

    expect(await screen.findByText('진행 전')).toBeTruthy();
    expect(screen.getByText('진행 후')).toBeTruthy();
    expect(screen.getByText('진단 없이 결제 유도')).toBeTruthy();
    expect(screen.getByText('진행 후 기록')).toBeTruthy();
  });

  it('phase 없는 기존 기록은 진행 후 슬롯에 놓인다', async () => {
    renderWith([{ ...ENTRY, strategy_id: 's-a' }]);
    await openSection('첫 세일즈콜');

    expect(await screen.findByText('진단 없이 결제 유도')).toBeTruthy();
    expect(screen.getByText('진행 전 기록')).toBeTruthy(); // 계획 슬롯은 비어 있다
  });

  it('같은 슬롯에 다시 저장하면 기록이 늘지 않고 교체된다', async () => {
    const onUpdate = vi.fn();
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (String(url).includes('/api/crm/students/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      const data = String(url).includes('/strategy-categories') ? CATS : STRATS;
      return Promise.resolve({ json: () => Promise.resolve({ data }) });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const student = {
      id: 'stu-1',
      lead_type: null,
      strategy_history: [{ ...ENTRY, strategy_id: 's-a', phase: 'planned' }],
    } as unknown as Student;
    render(<StrategyHistorySection student={student} adminKey="k" onUpdate={onUpdate} />);
    await openSection('첫 세일즈콜');

    fireEvent.click(await screen.findByText('다른 전략으로 변경'));
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 's-b' } });
    await act(async () => { fireEvent.click(screen.getByText('저장')); });

    const patch = fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/crm/students/'));
    const body = JSON.parse(String((patch![1] as RequestInit).body));
    expect(body.strategy_history).toHaveLength(1);
    expect(body.strategy_history[0].strategy_id).toBe('s-b');
    expect(body.strategy_history[0].phase).toBe('planned');
  });

  it('진행 후 슬롯에 저장하면 진행 전 기록은 그대로 남는다', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (String(url).includes('/api/crm/students/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      const data = String(url).includes('/strategy-categories') ? CATS : STRATS;
      return Promise.resolve({ json: () => Promise.resolve({ data }) });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const student = {
      id: 'stu-1',
      lead_type: null,
      strategy_history: [{ ...ENTRY, strategy_id: 's-a', phase: 'planned' }],
    } as unknown as Student;
    render(<StrategyHistorySection student={student} adminKey="k" onUpdate={vi.fn()} />);
    await openSection('첫 세일즈콜');

    fireEvent.click(await screen.findByText('진행 후 기록'));
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 's-b' } });
    await act(async () => { fireEvent.click(screen.getByText('저장')); });

    const patch = fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/crm/students/'));
    const body = JSON.parse(String((patch![1] as RequestInit).body));
    expect(body.strategy_history).toHaveLength(2);
    expect(body.strategy_history.map((e: { phase: string }) => e.phase).sort()).toEqual(['applied', 'planned']);
  });
});
