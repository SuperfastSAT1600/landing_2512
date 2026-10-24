/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ReadCompletePopup } from '../ReadCompletePopup';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

type IOCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let ioCallback: IOCallback | null = null;

class MockIntersectionObserver {
  constructor(cb: IOCallback) {
    ioCallback = cb;
  }
  observe() {}
  disconnect() {}
}

const post = { id: 'next-post', title: 'Next Post', featuredImage: '' };

function emit(isIntersecting: boolean, top: number) {
  act(() => {
    ioCallback?.([{ isIntersecting, boundingClientRect: { top } as DOMRectReadOnly }]);
  });
}

const popup = () => screen.getByRole('complementary');
const isShown = () => popup().className.includes('translate-y-0');

describe('ReadCompletePopup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    ioCallback = null;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    const sentinel = document.createElement('div');
    sentinel.id = 'post-end-sentinel';
    document.body.appendChild(sentinel);
    render(<ReadCompletePopup fixedPost={post} relatedPosts={[]} sentinelId="post-end-sentinel" />);
    act(() => { vi.advanceTimersByTime(2000); });
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // REQ-001
  it('shows after the remaining read time when the sentinel was reached early', () => {
    act(() => { vi.advanceTimersByTime(8000); }); // 10s since mount
    emit(true, 500);
    expect(isShown()).toBe(false);

    act(() => { vi.advanceTimersByTime(49_000); }); // 59s
    expect(isShown()).toBe(false);

    act(() => { vi.advanceTimersByTime(1_000); }); // 60s
    expect(isShown()).toBe(true);
  });

  it('shows immediately when the sentinel is reached after the minimum read time', () => {
    act(() => { vi.advanceTimersByTime(61_000); });
    emit(true, 500);
    expect(isShown()).toBe(true);
  });

  // REQ-002
  it('does not show if the reader scrolls back above the sentinel while waiting', () => {
    act(() => { vi.advanceTimersByTime(8000); });
    emit(true, 500);
    emit(false, 900); // sentinel now below the viewport
    act(() => { vi.advanceTimersByTime(120_000); });
    expect(isShown()).toBe(false);
  });

  // REQ-003
  it('stays visible once the reader scrolls past the sentinel', () => {
    act(() => { vi.advanceTimersByTime(61_000); });
    emit(true, 500);
    emit(false, -200); // sentinel scrolled out of the top
    expect(isShown()).toBe(true);
  });

  it('hides when the reader scrolls back up above the sentinel', () => {
    act(() => { vi.advanceTimersByTime(61_000); });
    emit(true, 500);
    emit(false, 900);
    expect(isShown()).toBe(false);
  });
});
