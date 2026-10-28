/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
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
