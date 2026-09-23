/// <reference types="vitest/globals" />
import { render, screen, fireEvent } from '@testing-library/react';
import { StrategyHistorySection } from '../StrategyHistorySection';
import type { Student, StrategyHistoryEntry } from '@/types/crm';

const ENTRY: StrategyHistoryEntry = {
  id: 'h1',
  type: 'initial_contact',
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
      [{ id: 's-live', name: '새 이름(라이브)', kind: 'initial_contact', category_id: 'cat-1' }],
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
      [{ id: 's-live', name: '개인화 메시지', kind: 'initial_contact', category_id: 'cat-1' }],
      [{ id: 'cat-1', name: '컨택 전략', sort_order: 0 }] // 라이브러리에서 개명된 상태
    );
    render(<StrategyHistorySection student={STUDENT} adminKey="k" onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByText('전략 히스토리'));
    expect(await screen.findByText('컨택 전략')).toBeTruthy();
    expect(screen.queryByText('최초 컨텍 전략')).toBeNull();
  });
});
