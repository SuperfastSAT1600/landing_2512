/**
 * 라벨 사전 도입이 기존 /admin/crm 화면을 바꾸지 않았는지 못 박는 회귀 테스트.
 * 프로덕션 호출부는 labels prop을 넘기지 않으므로, prop 없이 렌더했을 때 한글 문구가 그대로여야 한다.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ConsultationEntry } from '@/types/crm';
import { CRM_LABELS_EN } from '@/lib/crm-labels';
import { TimelineSection } from '../TimelineSection';

const noop = () => {};

const entry: ConsultationEntry = {
  id: 'e1',
  created_at: '2026-03-09T09:00:00.000Z',
  raw_memo: '학부모 통화. 다음 주 재상담 예정.',
  author: '이민재',
  published: false,
};

const baseProps = {
  studentId: 's1',
  adminKey: 'k',
  loadingFresh: false,
  publishError: '',
  publishing: false,
  memoSaving: null,
  aiLoadingFor: null,
  pendingEdits: {},
  setPendingEdits: noop,
  onAiCare: noop,
  onPublish: noop,
  onUnpublish: noop,
  onDeleteAi: noop,
  onEditMemo: async () => false,
  onDeleteMemo: noop,
};

describe('TimelineSection — 라벨 회귀', () => {
  it('labels 미지정이면 한글 제목과 항목 액션이 그대로다', () => {
    render(<TimelineSection {...baseProps} timeline={[entry]} defaultOpen />);
    expect(screen.getByText('상담 타임라인')).toBeTruthy();
    expect(screen.getByText('원본 수정')).toBeTruthy();
    expect(screen.getByText('메모 삭제')).toBeTruthy();
  });

  it('labels 미지정이면 날짜가 한국어 로케일로 표기된다', () => {
    render(<TimelineSection {...baseProps} timeline={[entry]} defaultOpen />);
    expect(screen.getByText(/2026년 3월 9일/)).toBeTruthy();
  });

  it('비어 있을 때 문구도 한글 기본값이다', () => {
    render(<TimelineSection {...baseProps} timeline={[]} defaultOpen />);
    expect(screen.getByText('상담 메모가 없습니다.')).toBeTruthy();
  });

  it('defaultOpen 기본값은 접힘 — 기존 동작 유지', () => {
    render(<TimelineSection {...baseProps} timeline={[entry]} />);
    expect(screen.queryByText('원본 수정')).toBeNull();
  });

  it('EN 사전 + readOnly면 영문으로 바뀌고 수정·삭제가 숨는다 (데모 경로)', () => {
    render(<TimelineSection {...baseProps} timeline={[entry]} defaultOpen readOnly labels={CRM_LABELS_EN} />);
    expect(screen.getByText('Advising Notes')).toBeTruthy();
    expect(screen.getByText(/March 9, 2026/)).toBeTruthy();
    expect(screen.queryByText('원본 수정')).toBeNull();
    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('highlightId가 맞는 항목만 강조된다', () => {
    const { container } = render(
      <TimelineSection {...baseProps} timeline={[entry]} defaultOpen highlightId="e1" />
    );
    expect(container.querySelector('#entry-e1')?.className).toContain('ring-2');
  });
});
