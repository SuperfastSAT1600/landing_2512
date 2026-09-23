/// <reference types="vitest/globals" />
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StrategyCreateForm } from '../StrategyCreateForm';

function renderForm() {
  const onCreated = vi.fn();
  render(
    <StrategyCreateForm
      categoryId="cat-1"
      segment="b2c"
      adminKey="key"
      onCreated={onCreated}
      onCancel={vi.fn()}
    />
  );
  return { onCreated };
}

describe('StrategyCreateForm — 카테고리만으로 만든다', () => {
  it('용도(kind) 라디오·안내 문구가 전혀 렌더링되지 않는다', () => {
    renderForm();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByText(/용도/)).toBeNull();
    expect(screen.queryByText('변경')).toBeNull();
  });

  it('생성 요청에 kind가 들어가지 않고 category_id만 실린다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 's-1' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { onCreated } = renderForm();
    fireEvent.change(screen.getByPlaceholderText('전략 이름 입력...'), { target: { value: '새 전략' } });
    await act(async () => {
      fireEvent.click(screen.getByText('추가'));
    });

    expect(onCreated).toHaveBeenCalled();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('kind');
    expect(body.category_id).toBe('cat-1');
    expect(body.segment).toBe('b2c');

    vi.unstubAllGlobals();
  });
});
