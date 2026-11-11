import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { WorkItem } from '@/lib/work-log';

vi.mock('../components/StudentPicker', () => ({ StudentPicker: () => null }));

import { WorkItemRow } from '../components/WorkItemRow';

const item: WorkItem = {
  messageTs: '1794200000.000100', postedAt: '2026-11-11T01:00:00.000Z', text: '테스트 글', authorName: '직원A', assignees: [],
  done: false, doneBy: null, doneAt: null, permalink: 'https://slack.com/x', replyCount: 0, fileCount: 0, student: null, dismissed: null,
};
const props = { onSetStudent: vi.fn(), onDismiss: vi.fn(), onRestore: vi.fn() };

beforeEach(() => vi.clearAllMocks());

// REQ-009
describe('WorkItemRow 삭제', () => {
  it('확인하면 삭제하고, 취소하면 삭제하지 않는다', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<WorkItemRow item={item} {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(props.onDismiss).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(props.onDismiss).toHaveBeenCalledWith(item);
  });

  it('삭제한 할 일은 누가 언제 지웠는지 보여주고 복구할 수 있다', () => {
    render(<WorkItemRow item={{ ...item, dismissed: { name: '테스트 글', by: '직원A', at: '2026-11-11T02:30:00.000Z' } }} {...props} />);
    expect(screen.getByText('11. 11. 11:30 삭제 직원A')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '복구' }));
    expect(props.onRestore).toHaveBeenCalledWith('1794200000.000100');
  });
});
