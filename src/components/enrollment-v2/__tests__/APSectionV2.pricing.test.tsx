/// <reference types="vitest/globals" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { APSectionV2 } from '../APSectionV2';

beforeAll(() => {
  class IO { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal('IntersectionObserver', IO);
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })));
});

function card(hours: number) {
  const section = document.getElementById('v2-pricing')!;
  const hourEl = [...section.querySelectorAll('button span')].find((el) => el.textContent === String(hours))!;
  return hourEl.closest('button')!;
}

// REQ-001·002 (ap-package-prices)
describe('AP 인기 패키지 가격', () => {
  it('16시간 144만원, 32시간 270만원, 48시간 380만원 — 할인액은 16시간 단가 기준', () => {
    render(<APSectionV2 />);
    expect(screen.getByText('아래 세 가지 시간을', { exact: false })).toBeTruthy();

    expect(card(16).textContent).toContain('144만원');
    expect(card(32).textContent).toContain('270만원');
    expect(card(32).textContent).toContain('(6% 할인) 16시간보다 18만원 더 저렴합니다.');
    expect(card(48).textContent).toContain('380만원');
    expect(card(48).textContent).toContain('(12% 할인) 16시간보다 52만원 더 저렴합니다.');
  });

  it('영문 화면도 같은 가격·할인액', () => {
    render(<APSectionV2 lang="en" />);
    expect(card(32).textContent).toContain('(6% off) saves');
    expect(card(32).textContent).toContain('vs. 16 hrs');
    expect(card(48).textContent).toContain('(12% off) saves');
  });
});

// REQ-004 (ap-package-prices)
describe('시간 직접 입력 계산기', () => {
  function setHours(h: number) {
    fireEvent.change(screen.getByRole('slider'), { target: { value: String(h) } });
  }
  function calc() {
    return screen.getByRole('slider').closest('section')!.textContent!;
  }

  it.each([
    [32, '270만원', '기본가보다 18만원 저렴합니다'],
    [48, '380만원', '기본가보다 52만원 저렴합니다'],
  ])('%i시간은 카드와 같은 가격', async (h, price, saved) => {
    render(<APSectionV2 />);
    setHours(h);
    // 가격 박스는 AnimatePresence(wait)로 교체되므로 퇴장 애니메이션이 끝날 때까지 기다린다.
    await waitFor(() => expect(calc()).toContain(saved));
    expect(calc()).toContain(price);
  });

  it('그 밖의 시간은 구간 단가 계산 그대로', async () => {
    render(<APSectionV2 />);
    setHours(31);
    await waitFor(() => expect(calc()).toContain('262만 2,600원')); // 31 × 84,600
  });
});
