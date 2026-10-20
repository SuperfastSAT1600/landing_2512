import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RenewalHiddenCandidates, HiddenSearchMatches } from '../RenewalHiddenCandidates';
import type { HiddenCandidate } from '../renewal-hidden-candidates';

const hidden: HiddenCandidate[] = [
  { studentId: 'a', name: '박주람', reason: 'in_pipeline', detail: '26년 10월 04주차 1단계(최초 컨택 전)' },
  { studentId: 'b', name: 'Claire S Lee', reason: 'no_srm_link', detail: '' },
  { studentId: 'c', name: 'Lauren Park', reason: 'no_srm_payment', detail: '' },
];

describe('RenewalHiddenCandidates', () => {
  it('조치가 필요한 학생은 펼쳐서, 진행 중은 건수만 접어서 보여 준다', () => {
    render(<RenewalHiddenCandidates hidden={hidden} searchQuery="" onSelectStudent={vi.fn()} />);
    expect(screen.getByTestId('hidden-candidates').textContent).toContain('목록에 없는 학생 3명');
    expect((screen.getByTestId('hidden-no_srm_link') as HTMLDetailsElement).open).toBe(true);
    expect((screen.getByTestId('hidden-no_srm_payment') as HTMLDetailsElement).open).toBe(true);
    expect(screen.getByText('Claire S Lee')).toBeTruthy();
    const pipeline = screen.getByTestId('hidden-in_pipeline') as HTMLDetailsElement;
    expect(pipeline.open).toBe(false);
    expect(pipeline.textContent).toContain('이미 재결제 진행 중 1명');
  });

  it('검색어로 거르고, 진행 중 매치가 있으면 펼친다', () => {
    render(<RenewalHiddenCandidates hidden={hidden} searchQuery="주람" onSelectStudent={vi.fn()} />);
    expect(screen.queryByText('Claire S Lee')).toBeNull();
    const pipeline = screen.getByTestId('hidden-in_pipeline') as HTMLDetailsElement;
    expect(pipeline.open).toBe(true);
    expect(pipeline.textContent).toContain('26년 10월 04주차 1단계(최초 컨택 전)');
  });

  it('검색어에 맞는 숨은 학생이 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(
      <RenewalHiddenCandidates hidden={hidden} searchQuery="없는이름" onSelectStudent={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('이름을 누르면 학생 패널을 연다', () => {
    const onSelect = vi.fn();
    render(<RenewalHiddenCandidates hidden={hidden} searchQuery="" onSelectStudent={onSelect} />);
    fireEvent.click(screen.getByText('Lauren Park'));
    expect(onSelect).toHaveBeenCalledWith('c');
  });
});

describe('HiddenSearchMatches', () => {
  it('검색 결과가 비었을 때 왜 없는지 이름과 이유로 알려 준다', () => {
    render(<HiddenSearchMatches hidden={hidden} searchQuery="박주람" onSelectStudent={vi.fn()} />);
    const box = screen.getByTestId('hidden-search-matches');
    expect(box.textContent).toContain('박주람');
    expect(box.textContent).toContain('이미 재결제 진행 중 · 26년 10월 04주차 1단계(최초 컨택 전)');
  });

  it('매치가 없으면 null — 기존 빈 목록 문구를 쓴다', () => {
    const { container } = render(
      <HiddenSearchMatches hidden={hidden} searchQuery="없는이름" onSelectStudent={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });
});
