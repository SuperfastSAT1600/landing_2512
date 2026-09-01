import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntfuncTrainingModal } from '../IntfuncTrainingModal';

const stats = (over: Record<string, number> = {}) => ({
  students: 40,
  rows: 32,
  converted: 20,
  lost: 12,
  excludedNoLabel: 0,
  excludedNoCalls: 8,
  cutoffUnavailable: 0,
  redactions: 91,
  ...over,
});

const job = (over: Record<string, unknown> = {}) => ({
  jobId: 'job_1',
  state: 'training',
  finished: false,
  packDigest: null,
  inputRows: 32,
  failureCode: null,
  deletionFailed: false,
  verifiedEmpty: null,
  ...over,
});

const okJson = (body: unknown) => ({ ok: true, json: async () => body });
const errJson = (body: unknown) => ({ ok: false, json: async () => body });
const mockFetch = () => fetch as unknown as ReturnType<typeof vi.fn>;

describe('IntfuncTrainingModal', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('외부 전송과 비용을 미리 알린다', () => {
    render(<IntfuncTrainingModal adminKey="k" onClose={() => {}} />);
    expect(screen.getByText(/외부\(IntelligentFunctions\)로 전송/)).toBeTruthy();
    expect(screen.getByText(/비용이 발생합니다/)).toBeTruthy();
  });

  it('열자마자 학습을 시작하지 않는다 — 비용이 드는 작업이다', () => {
    render(<IntfuncTrainingModal adminKey="k" onClose={() => {}} />);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('미리보기는 dry_run으로 보내고 업로드하지 않는다', async () => {
    mockFetch().mockResolvedValue(okJson({ data: { dryRun: true, stats: stats() } }));
    render(<IntfuncTrainingModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }));

    await waitFor(() => expect(screen.getByText('32행')).toBeTruthy());
    const body = JSON.parse(mockFetch().mock.calls[0][1].body);
    expect(body.dry_run).toBe(true);
  });

  it('관리자 키를 헤더로 보낸다', async () => {
    mockFetch().mockResolvedValue(okJson({ data: { dryRun: true, stats: stats() } }));
    render(<IntfuncTrainingModal adminKey="secret" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(mockFetch().mock.calls[0][1].headers['x-admin-key']).toBe('secret');
  });

  it('학습 시작은 jobId를 받고 대기하지 않는다 — 창을 닫아도 계속된다고 알린다', async () => {
    mockFetch().mockResolvedValue(okJson({ data: { ...job(), stats: stats() } }));
    render(<IntfuncTrainingModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '학습 시작' }));

    await waitFor(() => expect(screen.getByText('학습 중')).toBeTruthy());
    expect(screen.getByText(/이 창을 닫아도 중단되지 않습니다/)).toBeTruthy();
  });

  it('완료되면 packDigest와 파기 확인을 보여준다', async () => {
    mockFetch().mockResolvedValue(
      okJson({
        data: {
          ...job({
            state: 'completed',
            finished: true,
            packDigest: 'sha256:abc',
            verifiedEmpty: true,
          }),
          stats: stats(),
        },
      })
    );
    render(<IntfuncTrainingModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '학습 시작' }));

    await waitFor(() => expect(screen.getByText('학습이 완료되었습니다.')).toBeTruthy());
    expect(screen.getByText('sha256:abc')).toBeTruthy();
    expect(screen.getByText('확인됨')).toBeTruthy();
  });

  it('deletion_failed는 완료로 보이지 않고 파기 재시도를 제안한다', async () => {
    mockFetch().mockResolvedValue(
      okJson({
        data: {
          ...job({
            state: 'deletion_failed',
            finished: true,
            deletionFailed: true,
            packDigest: 'sha256:abc',
          }),
          stats: stats(),
        },
      })
    );
    render(<IntfuncTrainingModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '학습 시작' }));

    await waitFor(() => expect(screen.getByText('파기 재시도')).toBeTruthy());
    expect(screen.queryByText('학습이 완료되었습니다.')).toBeNull();
    expect(screen.getByText(/끝난 잡이 아닙니다/)).toBeTruthy();
  });

  it('절단 근거가 없는 학생이 있으면 누출 위험을 경고한다', async () => {
    mockFetch().mockResolvedValue(
      okJson({ data: { dryRun: true, stats: stats({ cutoffUnavailable: 5 }) } })
    );
    render(<IntfuncTrainingModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }));

    await waitFor(() => expect(screen.getByText('5명')).toBeTruthy());
    expect(screen.getByText(/결과 발화를 배울 수 있습니다/)).toBeTruthy();
  });

  it('서버 오류 메시지를 그대로 보여준다', async () => {
    mockFetch().mockResolvedValue(errJson({ error: '내보낼 행이 없습니다.' }));
    render(<IntfuncTrainingModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '학습 시작' }));

    await waitFor(() => expect(screen.getByText('내보낼 행이 없습니다.')).toBeTruthy());
  });
});
