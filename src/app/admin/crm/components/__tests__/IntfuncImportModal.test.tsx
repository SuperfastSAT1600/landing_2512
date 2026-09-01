import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntfuncImportModal } from '../IntfuncImportModal';

const stats = (over: Record<string, unknown> = {}) => ({
  students: 40,
  rows: 32,
  converted: 20,
  lost: 12,
  excludedNoLabel: 0,
  excludedNoTranscript: 4,
  excludedAllFiltered: 1,
  excludedAllTruncated: 2,
  cutoffUnavailable: 0,
  redactions: 91,
  callsTotal: 82,
  duplicateCalls: 1,
  callsFiltered: 37,
  callsTruncated: 16,
  callsKept: 28,
  callsByKind: { new_sales: 36, renewal: 18, winback: 8, ops: 11, unknown: 9 },
  ...over,
});

const summary = (over: Record<string, unknown> = {}) => ({
  importIds: ['imp_abc'],
  received: 32,
  imported: 30,
  skipped: 2,
  errors: [],
  ...over,
});

const okJson = (body: unknown) => ({ ok: true, json: async () => body });
const errJson = (body: unknown) => ({ ok: false, json: async () => body });
const mockFetch = () => fetch as unknown as ReturnType<typeof vi.fn>;

describe('IntfuncImportModal — REQ-206', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('외부 전송과 보관 사실을 미리 알린다 — 파기 영수증이 없는 경로다', () => {
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    expect(screen.getByText(/외부\(IntelligentFunctions\)로 전송/)).toBeTruthy();
    expect(screen.getByText(/보관됩니다/)).toBeTruthy();
  });

  it('학습은 콘솔에서 돈다고 알린다 — 이 버튼은 데이터만 보낸다', () => {
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    expect(screen.getByText(/콘솔/)).toBeTruthy();
  });

  it('열자마자 아무것도 보내지 않는다', () => {
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('미리보기는 dry_run으로 보낸다', async () => {
    mockFetch().mockResolvedValue(okJson({ data: { dryRun: true, stats: stats() } }));
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }));

    await waitFor(() => expect(screen.getByText('32행')).toBeTruthy());
    const [url, init] = mockFetch().mock.calls[0];
    expect(url).toBe('/api/crm/intfunc/import');
    expect(JSON.parse(init.body).dry_run).toBe(true);
  });

  it('관리자 키를 헤더로 보낸다', async () => {
    mockFetch().mockResolvedValue(okJson({ data: { dryRun: true, stats: stats() } }));
    render(<IntfuncImportModal adminKey="secret" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(mockFetch().mock.calls[0][1].headers['x-admin-key']).toBe('secret');
  });

  it('전송하면 저장·건너뛴 행 수와 importId를 보여준다 — 되돌리려면 그 id가 필요하다', async () => {
    mockFetch().mockResolvedValue(okJson({ data: { ...summary(), stats: stats() } }));
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'IF로 전송' }));

    await waitFor(() => expect(screen.getByText('30행')).toBeTruthy());
    expect(screen.getByText('2행')).toBeTruthy();
    expect(screen.getByText('imp_abc')).toBeTruthy();
  });

  it('실패한 행이 있으면 그 수를 보여준다', async () => {
    mockFetch().mockResolvedValue(
      okJson({
        data: {
          ...summary({ imported: 29, errors: [{ index: 3, code: 'dataset.cast.too_long' }] }),
          stats: stats(),
        },
      })
    );
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'IF로 전송' }));

    await waitFor(() => expect(screen.getByText('실패')).toBeTruthy());
    expect(screen.getByText('1행')).toBeTruthy();
    expect(screen.getByText(/dataset.cast.too_long/)).toBeTruthy();
  });

  it('전송이 끝나면 다시 보내지 못하게 막는다', async () => {
    mockFetch().mockResolvedValue(okJson({ data: { ...summary(), stats: stats() } }));
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'IF로 전송' }));

    await waitFor(() => expect(screen.getByText('30행')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'IF로 전송' }).hasAttribute('disabled')).toBe(true);
  });

  it('절단 근거가 없는 학생이 있으면 누출 위험을 경고한다', async () => {
    mockFetch().mockResolvedValue(
      okJson({ data: { dryRun: true, stats: stats({ cutoffUnavailable: 5 }) } })
    );
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }));

    await waitFor(() => expect(screen.getByText('5명')).toBeTruthy());
    expect(screen.getByText(/결과 발화를 배울 수 있습니다/)).toBeTruthy();
  });

  it('제외 사유를 사유별로 나눠 보여준다', async () => {
    mockFetch().mockResolvedValue(
      okJson({
        data: {
          dryRun: true,
          stats: stats({
            students: 644,
            rows: 32,
            excludedNoTranscript: 580,
            excludedAllFiltered: 9,
            excludedAllTruncated: 23,
          }),
        },
      })
    );
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }));

    await waitFor(() => expect(screen.getByText('580명')).toBeTruthy());
    expect(screen.getByText('전사 없음')).toBeTruthy();
    expect(screen.getByText('세일즈 콜 아님')).toBeTruthy();
    expect(screen.getByText('9명')).toBeTruthy();
    expect(screen.getByText('결과 확정 이후')).toBeTruthy();
    expect(screen.getByText('23명')).toBeTruthy();
  });

  it('통화 유형별 제외 건수를 보여준다', async () => {
    mockFetch().mockResolvedValue(okJson({ data: { dryRun: true, stats: stats() } }));
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }));

    await waitFor(() => expect(screen.getByText('28 / 82건')).toBeTruthy());
    expect(screen.getByText('재결제 / 이탈 / 운영')).toBeTruthy();
    expect(screen.getByText('18 / 8 / 11건')).toBeTruthy();
    expect(screen.getByText('중복 제거')).toBeTruthy();
  });

  it('서버 오류 메시지를 그대로 보여준다', async () => {
    mockFetch().mockResolvedValue(errJson({ error: '내보낼 행이 없습니다.' }));
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'IF로 전송' }));

    await waitFor(() => expect(screen.getByText('내보낼 행이 없습니다.')).toBeTruthy());
  });

  it('전송 실패는 사유와 code를 함께 보여준다 — REQ-208', async () => {
    mockFetch().mockResolvedValue(
      errJson({
        error: 'IF가 API 키를 거부했습니다 (401). INTFUNC_API_KEY를 확인하세요.',
        code: 'intfunc.auth',
      })
    );
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'IF로 전송' }));

    await waitFor(() => expect(screen.getByText('전송 실패')).toBeTruthy());
    expect(screen.getByText(/INTFUNC_API_KEY를 확인하세요/)).toBeTruthy();
    expect(screen.getByText('intfunc.auth')).toBeTruthy();
  });

  it('거절된 행 번호가 있으면 함께 보여준다 — REQ-208', async () => {
    mockFetch().mockResolvedValue(
      errJson({ error: '보낼 행 2개가 형식에 맞지 않습니다.', code: 'dataset.rows_invalid', rows: [3, 7] })
    );
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'IF로 전송' }));

    await waitFor(() => expect(screen.getByText(/거절된 행/)).toBeTruthy());
    expect(screen.getByText(/3, 7/)).toBeTruthy();
  });

  it('실패한 뒤에는 다시 보낼 수 있다 — 아무것도 들어가지 않았다', async () => {
    mockFetch().mockResolvedValue(errJson({ error: '전송에 실패했습니다.', code: 'unknown' }));
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'IF로 전송' }));

    await waitFor(() => expect(screen.getByText('전송 실패')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'IF로 전송' }).hasAttribute('disabled')).toBe(false);
  });

  it('재시도가 성공하면 앞선 실패 표시가 사라진다', async () => {
    mockFetch()
      .mockResolvedValueOnce(errJson({ error: '전송에 실패했습니다.', code: 'unknown' }))
      .mockResolvedValueOnce(okJson({ data: { ...summary(), stats: stats() } }));
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'IF로 전송' }));
    await waitFor(() => expect(screen.getByText('전송 실패')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'IF로 전송' }));
    await waitFor(() => expect(screen.getByText('30행')).toBeTruthy());
    expect(screen.queryByText('전송 실패')).toBeNull();
  });

  it('네트워크가 끊기면 그 사실을 알린다', async () => {
    mockFetch().mockRejectedValue(new TypeError('fetch failed'));
    render(<IntfuncImportModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'IF로 전송' }));

    await waitFor(() => expect(screen.getByText(/네트워크 오류/)).toBeTruthy());
  });
});
