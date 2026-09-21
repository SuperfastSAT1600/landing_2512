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

function mockFetchStrategies(data: unknown[]) {
  global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ data }) }) as unknown as typeof fetch;
}

async function openSection() {
  fireEvent.click(screen.getByText('전략 히스토리'));
  fireEvent.click(await screen.findByText('컨텍 전략'));
}

describe('StrategyHistorySection', () => {
  it('전략이 라이브러리에서 개명되면 히스토리 항목도 최신 이름을 보여준다', async () => {
    mockFetchStrategies([{ id: 's-live', name: '새 이름(라이브)', kind: 'initial_contact' }]);
    render(<StrategyHistorySection student={STUDENT} adminKey="k" onUpdate={vi.fn()} />);

    await openSection();

    expect(await screen.findByText('새 이름(라이브)')).toBeTruthy();
    expect(screen.queryByText('옛날 이름(스냅샷)')).toBeNull();
  });

  it('전략이 삭제되었으면(라이브 목록에 없으면) 스냅샷 이름으로 폴백한다', async () => {
    mockFetchStrategies([]);
    render(<StrategyHistorySection student={STUDENT} adminKey="k" onUpdate={vi.fn()} />);

    await openSection();

    expect(await screen.findByText('옛날 이름(스냅샷)')).toBeTruthy();
  });
});
