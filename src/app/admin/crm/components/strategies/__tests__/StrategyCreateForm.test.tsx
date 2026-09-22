/// <reference types="vitest/globals" />
import { render, screen, fireEvent } from '@testing-library/react';
import { StrategyCreateForm } from '../StrategyCreateForm';

function renderForm(defaultKind: 'initial_contact' | 'initial_sales' | 'retry' = 'initial_contact') {
  return render(
    <StrategyCreateForm
      categoryId="cat-1"
      segment="b2c"
      adminKey="key"
      defaultKind={defaultKind}
      onCreated={vi.fn()}
      onCancel={vi.fn()}
    />
  );
}

describe('StrategyCreateForm — 용도 선택 접기', () => {
  it('기본 상태에선 라디오 3개가 안 보이고 기본값 텍스트만 보인다', () => {
    renderForm('initial_contact');
    expect(screen.queryByRole('radio', { name: '최초 컨텍용' })).toBeNull();
    expect(screen.queryByRole('radio', { name: '최초 세일즈용' })).toBeNull();
    expect(screen.queryByRole('radio', { name: '재시도용' })).toBeNull();
    expect(screen.getByText(/최초 컨텍용/)).toBeTruthy();
  });

  it('"변경" 클릭 시 라디오 3개가 펼쳐진다', () => {
    renderForm('initial_contact');
    fireEvent.click(screen.getByText('변경'));
    expect(screen.getByRole('radio', { name: '최초 컨텍용' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '최초 세일즈용' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '재시도용' })).toBeTruthy();
  });

  it('펼친 뒤 다른 용도를 고르면 기본값 텍스트도 바뀐다', () => {
    renderForm('initial_contact');
    fireEvent.click(screen.getByText('변경'));
    fireEvent.click(screen.getByRole('radio', { name: '재시도용' }));
    expect(screen.getByRole('radio', { name: '재시도용' })).toHaveProperty('checked', true);
  });
});
