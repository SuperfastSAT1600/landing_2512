/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelineEntry } from '../TimelineEntry';
import type { ConsultationEntry } from '@/types/crm';

const baseEntry: ConsultationEntry = {
  id: 'e1',
  created_at: '2026-08-07T07:02:54.000Z',
  raw_memo: '🎙️ Plaud 상담 자동 요약 · Welcome to Plaud.ai\n\n[핵심 요약]\n...',
  published: false,
};

function renderEntry(entry: ConsultationEntry, overrides: Partial<Record<string, unknown>> = {}) {
  return render(
    <TimelineEntry
      studentId="s1"
      adminKey="k"
      entry={entry}
      aiLoading={false}
      pendingEdit={null}
      publishing={false}
      memoSaving={false}
      onAiCare={() => {}}
      onPublish={() => {}}
      onChangePurified={() => {}}
      onStartEdit={() => {}}
      onDeleteAi={() => {}}
      onEditMemo={async () => true}
      onDeleteMemo={() => {}}
      {...overrides}
    />
  );
}

describe('TimelineEntry — 작성자(상담인) 표시', () => {
  it('author가 있으면 카드에 작성자명을 표시한다', () => {
    renderEntry({ ...baseEntry, author: '김우영' });
    expect(screen.getByText('김우영')).toBeTruthy();
  });

  it('author가 없으면 작성자명을 렌더하지 않는다', () => {
    renderEntry({ ...baseEntry, author: undefined });
    // 특정 이름이 없어야 함(날짜 등 다른 텍스트는 존재).
    expect(screen.queryByText('김우영')).toBeNull();
  });

  it('앞에 번호가 붙은 표기("2)이민재")는 번호를 떼고 이름만 표시한다', () => {
    renderEntry({ ...baseEntry, author: '2)이민재' });
    expect(screen.getByText('이민재')).toBeTruthy();
    expect(screen.queryByText('2)이민재')).toBeNull();
  });

  it('메모 삭제 버튼을 누르면 onDeleteMemo가 호출된다', () => {
    const onDeleteMemo = vi.fn();
    renderEntry(baseEntry, { onDeleteMemo });
    fireEvent.click(screen.getByText('메모 삭제'));
    expect(onDeleteMemo).toHaveBeenCalledTimes(1);
  });
});
