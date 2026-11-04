import { renderHook, act } from '@testing-library/react';
import { useMemoSection } from '../useMemoSection';
import type { ConsultationEntry } from '@/types/crm';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const entry = { id: 'e1', raw_memo: '상담 메모', created_at: '2026-11-04T00:00:00Z' } as ConsultationEntry;
const fail = { ok: false, status: 502, json: async () => ({ error: { code: 'UPSTREAM_ERROR', message: 'AI returned invalid format' } }) };
const okDraft = { ok: true, status: 200, json: async () => ({ data: { purified: '요약', coach_history: '', deleted_items: [] } }) };

function setup() {
  return renderHook(() =>
    useMemoSection({ studentId: 's1', adminKey: 'k', setTimeline: vi.fn(), onUpdate: vi.fn() })
  );
}

// REQ-002
describe('useMemoSection — AI 초안 실패 표시', () => {
  beforeEach(() => vi.clearAllMocks());

  it('기록된 메모의 AI 초안이 실패하면 그 메모에 오류를 남기고, 다시 성공하면 지운다', async () => {
    const { result } = setup();
    fetchMock.mockResolvedValueOnce(fail);
    await act(() => result.current.triggerAiCare(entry));
    expect(result.current.aiError).toEqual({ entryId: 'e1', message: expect.stringContaining('AI returned invalid format') });

    fetchMock.mockResolvedValueOnce(okDraft);
    await act(() => result.current.triggerAiCare(entry));
    expect(result.current.aiError).toBeNull();
    expect(result.current.pendingEdits.e1.purified).toBe('요약');
  });

  it('네트워크 오류도 오류로 남긴다', async () => {
    const { result } = setup();
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await act(() => result.current.triggerAiCare(entry));
    expect(result.current.aiError?.entryId).toBe('e1');
  });

  it('새 메모의 AI 초안이 실패하면 memoError로 보여 준다', async () => {
    const { result } = setup();
    act(() => result.current.setMemoText('새 메모'));
    fetchMock.mockResolvedValueOnce(fail);
    await act(() => result.current.draftParentNote());
    expect(result.current.memoError).toContain('AI returned invalid format');
  });
});
