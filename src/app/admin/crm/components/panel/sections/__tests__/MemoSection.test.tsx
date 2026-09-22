/// <reference types="vitest/globals" />
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoSection } from '../MemoSection';

function baseProps(over: Partial<React.ComponentProps<typeof MemoSection>> = {}) {
  return {
    memoText: '',
    setMemoText: vi.fn(),
    parentText: '',
    setParentText: vi.fn(),
    parentDrafting: false,
    onDraftParent: vi.fn(),
    savingMemo: false,
    memoError: '',
    setMemoError: vi.fn(),
    onAddMemo: vi.fn(),
    staged: [],
    onAddFiles: vi.fn(),
    onRemoveAttachment: vi.fn(),
    attachmentsUploading: false,
    onOpenPlaud: vi.fn(),
    ...over,
  };
}

describe('MemoSection — 전략 없는 최초 세일즈 리드 메모 차단', () => {
  it('blocked=true면 안내 문구를 보여주고 입력·저장을 막는다', () => {
    render(<MemoSection {...baseProps({ blocked: true, blockedReason: '이 리드에 적용된 전략이 없어 메모를 입력할 수 없습니다.' })} />);
    fireEvent.click(screen.getByText('상담 메모'));
    expect(screen.getByText('이 리드에 적용된 전략이 없어 메모를 입력할 수 없습니다.')).toBeTruthy();
    expect((screen.getByPlaceholderText(/^상담 내용을 입력하세요/) as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByText('메모 저장') as HTMLButtonElement).disabled).toBe(true);
  });

  it('blocked=false(기본)면 평소처럼 입력 가능하다', () => {
    render(<MemoSection {...baseProps()} />);
    fireEvent.click(screen.getByText('상담 메모'));
    expect(screen.queryByText('이 리드에 적용된 전략이 없어 메모를 입력할 수 없습니다.')).toBeNull();
    expect((screen.getByPlaceholderText(/^상담 내용을 입력하세요/) as HTMLTextAreaElement).disabled).toBe(false);
  });
});
