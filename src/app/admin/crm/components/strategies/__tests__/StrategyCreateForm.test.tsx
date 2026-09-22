/// <reference types="vitest/globals" />
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StrategyCreateForm } from '../StrategyCreateForm';

function renderForm(defaultKind: 'initial_contact' | 'initial_sales' | 'retry' = 'initial_contact') {
  const onCreated = vi.fn();
  render(
    <StrategyCreateForm
      categoryId="cat-1"
      segment="b2c"
      adminKey="key"
      defaultKind={defaultKind}
      onCreated={onCreated}
      onCancel={vi.fn()}
    />
  );
  return { onCreated };
}

describe('StrategyCreateForm — 용도 선택 UI 없음', () => {
  it('용도 라디오·안내 문구가 전혀 렌더링되지 않는다', () => {
    renderForm('initial_contact');
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByText(/용도/)).toBeNull();
    expect(screen.queryByText('변경')).toBeNull();
  });

  it('전략 생성 시 defaultKind가 그대로 kind로 전송된다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 's-1' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { onCreated } = renderForm('retry');
    fireEvent.change(screen.getByPlaceholderText('전략 이름 입력...'), { target: { value: '새 전략' } });
    await act(async () => {
      fireEvent.click(screen.getByText('추가'));
    });

    expect(onCreated).toHaveBeenCalled();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.kind).toBe('retry');
    expect(body.category_id).toBe('cat-1');

    vi.unstubAllGlobals();
  });
});
