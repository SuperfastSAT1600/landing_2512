/// <reference types="vitest/globals" />
import { render, screen, fireEvent, within } from '@testing-library/react';
import { EnrollmentV2Page } from '../EnrollmentV2Page';
import { ENROLLMENT_V2, ENROLLMENT_V3 } from '../variants';

beforeAll(() => {
  // jsdom에 없는 브라우저 API — 화면 스크롤·영상은 이 테스트의 관심사가 아니다.
  class IO { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal('IntersectionObserver', IO);
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })));
});

function pickOneOnOne() {
  fireEvent.click(screen.getByRole('button', { name: 'SAT' }));
  fireEvent.click(screen.getByText('1:1 정규수업'));
}

describe('수업권 V3 화면', () => {
  // REQ-002 (enrollment-v3)
  it('관리형/자기주도 선택 단계가 없고, 수업 형태는 1:1·1:4만 보인다', () => {
    render(<EnrollmentV2Page variant={ENROLLMENT_V3} />);
    fireEvent.click(screen.getByRole('button', { name: 'SAT' }));
    expect(screen.queryByText('자기주도 수업')).toBeNull();
    expect(screen.getByText('1:1 정규수업')).toBeTruthy();
    expect(screen.getByText('1:4 특강수업')).toBeTruthy();
    expect(screen.queryByText('콘텐츠 학습')).toBeNull();
  });

  it('1:1을 고르면 묶음 제목 2개와 시간권 카드 4개(관리형 1 + 대표코치 3)', () => {
    render(<EnrollmentV2Page variant={ENROLLMENT_V3} />);
    pickOneOnOne();
    expect(screen.getByText('관리형 1:1 수업')).toBeTruthy();
    expect(screen.getByText('프리미엄 · SuperfastSAT 대표코치 1:1')).toBeTruthy();
    for (const price of ['165만원', '210만원', '380만원', '686만원']) {
      expect(screen.getByText(price).closest('button')).toBeTruthy();
    }
    expect(screen.queryByText('299만원')).toBeNull();
  });

  it('대표코치 20·40시간 카드에 할인율·할인액, 40시간에 최대 할인 배지', () => {
    render(<EnrollmentV2Page variant={ENROLLMENT_V3} />);
    pickOneOnOne();
    const card20 = screen.getByText('380만원').closest('button')!;
    expect(within(card20).getByText(/9% 할인/)).toBeTruthy();
    expect(within(card20).getByText(/40만원 더 저렴합니다/)).toBeTruthy();
    const card40 = screen.getByText('686만원').closest('button')!;
    expect(within(card40).getByText(/18% 할인/)).toBeTruthy();
    expect(within(card40).getByText(/154만원 더 저렴합니다/)).toBeTruthy();
    expect(within(card40).getByText('최대 할인')).toBeTruthy();
    expect(within(card20).queryByText('최대 할인')).toBeNull();
    const card10 = screen.getByText('210만원').closest('button')!;
    expect(within(card10).queryByText(/할인/)).toBeNull();
  });

  it('대표코치 20시간 카드를 고르면 그 카드만 선택되고 대표코치 라인업이 열린다', () => {
    render(<EnrollmentV2Page variant={ENROLLMENT_V3} />);
    pickOneOnOne();
    expect(screen.queryByText('대표코치 라인업')).toBeNull();
    const card20 = screen.getByText('380만원').closest('button')!;
    fireEvent.click(card20);
    expect(card20.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('686만원').closest('button')!.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('대표코치 라인업')).toBeTruthy();
  });

  it('v2는 그대로 — 자기주도 선택지와 관리형 3개 시간권', () => {
    render(<EnrollmentV2Page variant={ENROLLMENT_V2} />);
    fireEvent.click(screen.getByRole('button', { name: 'SAT' }));
    expect(screen.getAllByText('자기주도 수업').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText('관리형 수업')[0]);
    fireEvent.click(screen.getByText('1:1 정규수업'));
    expect(screen.getByText('165만원')).toBeTruthy();
    expect(screen.getByText('299만원')).toBeTruthy();
    expect(screen.getByText('539만원')).toBeTruthy();
    const director = screen.getByText('SuperfastSAT 대표코치의 1:1 수업').closest('button')!;
    expect(within(director).getByText('210만원')).toBeTruthy();
    expect(within(director).queryByText(/할인\)/)).toBeNull();
  });
});
