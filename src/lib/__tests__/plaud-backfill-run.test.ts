import { describe, it, expect, vi } from 'vitest';
import { runBackfill, type BackfillDeps } from '@/lib/plaud-backfill-run';
import { PLAUD_MEMO_MARKER } from '@/lib/plaud-backfill';
import type { PlaudRecording } from '@/lib/plaud-client';

// 픽스처는 전부 가상이다. 공개 저장소이므로 실제 학생 이름·전사를 넣지 않는다.
const memoOf = (name: string, kst: string) =>
  `${PLAUD_MEMO_MARKER} · ${name} · ${kst}\n\n[핵심 요약]\n상담 진행.`;

const entry = (id: string, raw_memo: string) => ({
  id,
  created_at: '2026-08-01T00:00:00Z',
  raw_memo,
  published: false,
});

// 2026-08-01 10:05 KST == 2026-08-01T01:05:00 UTC
const recA: PlaudRecording = { id: 'file_a', name: '녹음 A', start_at: '2026-08-01T01:05:00', duration: 1_260_000 };
const recB: PlaudRecording = { id: 'file_b', name: '녹음 B', start_at: '2026-08-02T02:00:00', duration: 600_000 };

function makeDeps(over: Partial<BackfillDeps> = {}): BackfillDeps {
  return {
    listStudents: vi.fn().mockResolvedValue([
      { id: 'stu-1', consultation_timeline: [entry('e1', memoOf('녹음 A', '2026-08-01 10:05'))] },
      { id: 'stu-2', consultation_timeline: [entry('e2', memoOf('녹음 B', '2026-08-02 11:00'))] },
    ]),
    listCapturedEntryIds: vi.fn().mockResolvedValue(new Set<string>()),
    listRecordings: vi.fn().mockResolvedValue([recA, recB]),
    getFile: vi.fn(async (fileId: string) => ({
      id: fileId,
      name: 'x',
      presigned_url: `https://s3/${fileId}.mp3?sig=1`,
    })),
    transcribe: vi.fn().mockResolvedValue('화자1: 안녕하세요\n화자2: 네'),
    insert: vi.fn().mockResolvedValue(undefined),
    log: vi.fn(),
    ...over,
  } as BackfillDeps;
}

describe('runBackfill', () => {
  it('매칭된 메모마다 전사해 저장하고 집계를 돌려준다', async () => {
    const deps = makeDeps();
    const report = await runBackfill(deps, { accounts: ['me'] });

    expect(report.inserted).toBe(2);
    expect(report.unmatched).toBe(0);
    expect(report.failed).toBe(0);
    expect(deps.transcribe).toHaveBeenCalledTimes(2);
    expect(deps.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 'stu-1',
        timelineEntryId: 'e1',
        source: 'plaud',
        externalId: 'file_a',
        recordingName: '녹음 A',
        recordedAt: '2026-08-01T01:05:00',
        durationSec: 1260,
        transcript: '화자1: 안녕하세요\n화자2: 네',
      })
    );
  });

  it('--dry-run은 아무것도 쓰지 않고 ASR도 태우지 않는다', async () => {
    const deps = makeDeps();
    const report = await runBackfill(deps, { accounts: ['me'], dryRun: true });

    expect(report.wouldInsert).toBe(2);
    expect(report.inserted).toBe(0);
    expect(deps.getFile).not.toHaveBeenCalled();
    expect(deps.transcribe).not.toHaveBeenCalled();
    expect(deps.insert).not.toHaveBeenCalled();
  });

  it('이미 전사가 있는 엔트리는 건너뛴다 (재실행 시 0건 삽입)', async () => {
    const deps = makeDeps({
      listCapturedEntryIds: vi.fn().mockResolvedValue(new Set(['e1', 'e2'])),
    });
    const report = await runBackfill(deps, { accounts: ['me'] });

    expect(report.inserted).toBe(0);
    expect(report.skipped).toBe(2);
    expect(deps.transcribe).not.toHaveBeenCalled();
  });

  it('--limit은 ASR 호출 수를 묶는다', async () => {
    const deps = makeDeps();
    const report = await runBackfill(deps, { accounts: ['me'], limit: 1 });

    expect(deps.transcribe).toHaveBeenCalledTimes(1);
    expect(report.inserted).toBe(1);
    expect(report.remaining).toBe(1);
  });

  it('매칭되지 않은 메모는 ASR을 태우지 않고 보고만 한다', async () => {
    const deps = makeDeps({ listRecordings: vi.fn().mockResolvedValue([recA]) });
    const report = await runBackfill(deps, { accounts: ['me'] });

    expect(report.inserted).toBe(1);
    expect(report.unmatched).toBe(1);
    expect(report.unmatchedEntries).toEqual([
      { studentId: 'stu-2', entryId: 'e2', recordingName: '녹음 B', reason: 'not_found' },
    ]);
    expect(deps.transcribe).toHaveBeenCalledTimes(1);
  });

  it('후보가 둘 이상이면 추측하지 않고 ambiguous로 남긴다', async () => {
    const dup = { ...recA, id: 'file_a2' };
    const deps = makeDeps({
      listStudents: vi.fn().mockResolvedValue([
        // 시각 없는 헤더 — 이름만으로는 갈라낼 수 없다
        { id: 'stu-1', consultation_timeline: [entry('e1', `${PLAUD_MEMO_MARKER} · 녹음 A\n\n본문`)] },
      ]),
      listRecordings: vi.fn().mockResolvedValue([recA, dup]),
    });
    const report = await runBackfill(deps, { accounts: ['me'] });

    expect(report.ambiguous).toBe(1);
    expect(report.inserted).toBe(0);
    expect(deps.transcribe).not.toHaveBeenCalled();
  });

  it('한 건의 ASR 실패가 나머지를 중단시키지 않는다', async () => {
    const transcribe = vi
      .fn()
      .mockRejectedValueOnce(new Error('asr down'))
      .mockResolvedValue('화자1: 두 번째');
    const deps = makeDeps({ transcribe });
    const report = await runBackfill(deps, { accounts: ['me'] });

    expect(report.failed).toBe(1);
    expect(report.inserted).toBe(1);
    expect(report.failedEntries[0]).toMatchObject({ entryId: 'e1', error: 'asr down' });
  });

  it('삽입 실패도 건별로 기록하고 계속 간다', async () => {
    const insert = vi.fn().mockRejectedValueOnce(new Error('duplicate key')).mockResolvedValue(undefined);
    const deps = makeDeps({ insert });
    const report = await runBackfill(deps, { accounts: ['me'] });

    expect(report.failed).toBe(1);
    expect(report.inserted).toBe(1);
  });

  it('여러 계정 목록을 합치고, 녹음이 속한 계정으로 파일을 가져온다', async () => {
    const listRecordings = vi.fn(async (key: string) => (key === 'me' ? [recA] : [recB]));
    const deps = makeDeps({ listRecordings });
    await runBackfill(deps, { accounts: ['me', 'wooyoung'] });

    expect(listRecordings).toHaveBeenCalledWith('me');
    expect(listRecordings).toHaveBeenCalledWith('wooyoung');
    expect(deps.getFile).toHaveBeenCalledWith('file_a', 'me');
    expect(deps.getFile).toHaveBeenCalledWith('file_b', 'wooyoung');
  });

  it('한 계정 목록 조회가 실패해도 나머지 계정으로 진행한다', async () => {
    const listRecordings = vi.fn(async (key: string) => {
      if (key === 'me') throw new Error('mcp down');
      return [recB];
    });
    const deps = makeDeps({ listRecordings });
    const report = await runBackfill(deps, { accounts: ['me', 'wooyoung'] });

    expect(report.inserted).toBe(1); // stu-2 / 녹음 B
    expect(report.unmatched).toBe(1); // stu-1 / 녹음 A — 목록을 못 받아 매칭 불가
  });

  it('Plaud 메모가 하나도 없으면 조용히 0건으로 끝난다', async () => {
    const deps = makeDeps({
      listStudents: vi.fn().mockResolvedValue([
        { id: 'stu-3', consultation_timeline: [entry('e9', '직접 작성 메모')] },
        { id: 'stu-4', consultation_timeline: null },
      ]),
    });
    const report = await runBackfill(deps, { accounts: ['me'] });

    expect(report).toMatchObject({ inserted: 0, unmatched: 0, ambiguous: 0, failed: 0, skipped: 0 });
    expect(deps.listRecordings).not.toHaveBeenCalled(); // 후보가 없으면 Plaud를 부르지도 않는다
  });
});
