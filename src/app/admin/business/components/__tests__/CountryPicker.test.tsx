import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CountryPicker } from '../CountryPicker';

function open(label = '국가') {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }));
  return screen.getByRole('combobox', { name: '국가 검색' });
}

describe('CountryPicker', () => {
  it('선택된 국가를 한글·영문 병기로 보여준다', () => {
    render(<CountryPicker value="PK" onChange={() => {}} label="국가" />);
    expect(screen.getByRole('button', { name: /파키스탄/ }).textContent).toContain('Pakistan');
  });

  it('선택이 없으면 안내 문구를 보여준다', () => {
    render(<CountryPicker value={null} onChange={() => {}} label="국가" placeholder="국가 선택" />);
    expect(screen.getByRole('button', { name: /국가 선택/ })).toBeTruthy();
  });

  it('열면 검색창과 목록이 나온다', () => {
    render(<CountryPicker value={null} onChange={() => {}} label="국가" />);
    open();
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getAllByRole('option').length).toBeGreaterThan(5);
  });

  it('영문으로 검색해 고를 수 있다', () => {
    const onChange = vi.fn();
    render(<CountryPicker value={null} onChange={onChange} label="국가" />);
    const input = open();

    fireEvent.change(input, { target: { value: 'pakistan' } });
    const options = screen.getAllByRole('option');
    expect(options[0].textContent).toContain('파키스탄');
    expect(options[0].textContent).toContain('Pakistan');

    fireEvent.click(options[0]);
    expect(onChange).toHaveBeenCalledWith('PK');
  });

  it('한글로도 검색된다', () => {
    render(<CountryPicker value={null} onChange={() => {}} label="국가" />);
    const input = open();
    fireEvent.change(input, { target: { value: '파키' } });
    expect(screen.getAllByRole('option')[0].textContent).toContain('파키스탄');
  });

  it('결과가 없으면 안내를 보여준다', () => {
    render(<CountryPicker value={null} onChange={() => {}} label="국가" />);
    const input = open();
    fireEvent.change(input, { target: { value: 'zzzzzz' } });
    expect(screen.getByText(/검색 결과가 없습니다/)).toBeTruthy();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('방향키와 Enter로 고를 수 있다', () => {
    const onChange = vi.fn();
    render(<CountryPicker value={null} onChange={onChange} label="국가" />);
    const input = open();

    fireEvent.change(input, { target: { value: 'pak' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('PK');
  });

  it('Escape로 닫고 아무것도 고르지 않는다', () => {
    const onChange = vi.fn();
    render(<CountryPicker value={null} onChange={onChange} label="국가" />);
    const input = open();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('선택 후에는 목록이 닫힌다', () => {
    render(<CountryPicker value={null} onChange={() => {}} label="국가" />);
    const input = open();
    fireEvent.change(input, { target: { value: 'pk' } });
    fireEvent.click(screen.getAllByRole('option')[0]);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('allowClear면 미지정으로 되돌릴 수 있다', () => {
    const onChange = vi.fn();
    render(<CountryPicker value="PK" onChange={onChange} label="국가" allowClear />);
    open('파키스탄');
    fireEvent.click(screen.getByRole('button', { name: '미지정으로 두기' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
