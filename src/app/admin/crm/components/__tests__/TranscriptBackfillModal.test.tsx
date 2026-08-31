import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TranscriptBackfillModal } from '../TranscriptBackfillModal';

const report = (over: Partial<Record<string, number>> = {}) => ({
  data: {
    candidates: 7, inserted: 2, failed: 0, remaining: 3,
    unmatched: 0, ambiguous: 0, ...over,
  },
});

const okJson = (body: unknown) => ({ ok: true, json: async () => body });

describe('TranscriptBackfillModal', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('임시 기능임을 사용자에게 알린다', () => {
    render(<TranscriptBackfillModal adminKey="k" onClose={() => {}} />);
    expect(screen.getByText(/임시 기능입니다/)).toBeTruthy();
    expect(screen.getByText(/탭을 닫지 마세요/)).toBeTruthy();
  });

  it('열자마자 전사를 시작하지 않는다 — 비용이 드는 작업이므로 명시적 클릭이 필요하다', () => {
    render(<TranscriptBackfillModal adminKey="k" onClose={() => {}} />);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('remaining이 0이 될 때까지 반복 호출하고 누적 집계를 보여준다', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(okJson(report({ inserted: 2, remaining: 3 })))
      .mockResolvedValueOnce(okJson(report({ inserted: 2, remaining: 1 })))
      .mockResolvedValueOnce(okJson(report({ inserted: 1, remaining: 0 })));

    render(<TranscriptBackfillModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByText('전사 시작'));

    await waitFor(() => expect(screen.getByText('완료되었습니다.')).toBeTruthy());
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(screen.getByText('5건')).toBeTruthy(); // 저장 완료 = 2+2+1 누적 (대상 7건과 구분됨)
  });

  it('관리자 키를 헤더로 보낸다', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(okJson(report({ remaining: 0 })));
    render(<TranscriptBackfillModal adminKey="secret" onClose={() => {}} />);
    fireEvent.click(screen.getByText('전사 시작'));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers['x-admin-key']).toBe('secret');
  });

  it('대상 건수는 첫 응답 값으로 고정된다 — 진행하며 줄어들면 안 된다', async () => {
    // candidates는 남은 후보 수라 매 배치마다 줄어든다. 그대로 표시하면
    // "대상 1건 / 저장 5건" 같은 모순된 화면이 된다.
    (fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(okJson(report({ candidates: 7, inserted: 2, remaining: 5 })))
      .mockResolvedValueOnce(okJson(report({ candidates: 5, inserted: 2, remaining: 3 })))
      .mockResolvedValueOnce(okJson(report({ candidates: 3, inserted: 1, remaining: 0 })));

    render(<TranscriptBackfillModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByText('전사 시작'));

    await waitFor(() => expect(screen.getByText('완료되었습니다.')).toBeTruthy());
    expect(screen.getByText('7건')).toBeTruthy(); // 대상 = 첫 응답 7 (저장 5건과 구분됨)
  });

  it('저장도 실패도 0인 응답이 반복돼도 무한 루프에 빠지지 않는다', async () => {
    // 목록 조회만으로 시간 예산이 소진되면 inserted=0, failed=0, remaining>0이 계속 온다.
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      okJson(report({ inserted: 0, failed: 0, remaining: 4 }))
    );

    render(<TranscriptBackfillModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByText('전사 시작'));

    await waitFor(() => expect(screen.getByText(/처리가 진행되지 않아 중단/)).toBeTruthy());
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('서버 오류면 반복을 멈추고 원인을 보여준다', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Plaud 연결 실패' }),
    });

    render(<TranscriptBackfillModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByText('전사 시작'));

    await waitFor(() => expect(screen.getByText('Plaud 연결 실패')).toBeTruthy());
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('진행이 전혀 없으면 무한 루프에 빠지지 않고 중단한다', async () => {
    // 매 배치가 0건 저장 + 실패만 반복 → remaining이 줄지 않는다
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      okJson(report({ inserted: 0, failed: 2, remaining: 3 }))
    );

    render(<TranscriptBackfillModal adminKey="k" onClose={() => {}} />);
    fireEvent.click(screen.getByText('전사 시작'));

    await waitFor(() => expect(screen.getByText(/처리가 진행되지 않아 중단/)).toBeTruthy());
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
