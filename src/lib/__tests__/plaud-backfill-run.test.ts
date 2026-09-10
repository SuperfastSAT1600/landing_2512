import { describe, it, expect, vi } from 'vitest';
import { runBackfill, type BackfillDeps } from '@/lib/plaud-backfill-run';
import { PLAUD_MEMO_MARKER } from '@/lib/plaud-backfill';
import type { PlaudRecording } from '@/lib/plaud-client';
import type { CallTranscriptInput } from '@/lib/call-transcripts';

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
    findExisting: vi.fn().mockResolvedValue(null),
    log: vi.fn(),
    ...over,
  } as BackfillDeps;
}

/**
 * 삽입한 전사를 기억하는 가짜 저장소. 한 번 넣은 녹음은 다음 후보에서 조회된다 —
 * 실제 DB에서 `(source, external_id)` 조회가 도는 방식과 같은 순서를 만든다.
 */
function makeStore() {
  const rows = new Map<string, { transcript: string; asrModel: string | null }>();
  return {
    seed: (externalId: string, transcript: string, asrModel: string | null) =>
      rows.set(externalId, { transcript, asrModel }),
    insert: vi.fn(async (input: CallTranscriptInput) => {
      if (input.externalId && !rows.has(input.externalId)) {
        rows.set(input.externalId, { transcript: input.transcript, asrModel: input.asrModel ?? null });
      }
    }),
    findExisting: vi.fn(async (_source: string, externalId: string) => rows.get(externalId) ?? null),
  };
}

/** 두 상담메모가 같은 녹음 하나를 가리키는 상황 (자매 학생 / 메모 중복 생성). */
const twoMemosOneRecording = () =>
  vi.fn().mockResolvedValue([
    { id: 'stu-1', consultation_timeline: [entry('e1', memoOf('녹음 A', '2026-08-01 10:05'))] },
    { id: 'stu-2', consultation_timeline: [entry('e2', memoOf('녹음 A', '2026-08-01 10:05'))] },
  ]);

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

  it('같은 녹음에 걸린 메모가 여럿이면 ASR은 한 번만 태우고 행은 메모마다 만든다', async () => {
    const store = makeStore();
    const deps = makeDeps({ listStudents: twoMemosOneRecording(), ...store });
    const report = await runBackfill(deps, { accounts: ['me'], asrModel: 'fun-asr' });

    expect(report.inserted).toBe(2);
    expect(report.failed).toBe(0);
    expect(deps.transcribe).toHaveBeenCalledTimes(1); // 전사는 녹음의 속성이지 메모의 속성이 아니다
    expect(store.insert).toHaveBeenCalledTimes(2);
    expect(store.insert.mock.calls.map((c) => c[0].timelineEntryId)).toEqual([
      'e1',
      'e2',
    ]);
  });

  it('재사용된 행은 현재 실행 모델이 아니라 원본의 asr_model을 승계한다', async () => {
    // 이전 실행이 구 모델로 이미 전사해 둔 녹음. 이번 실행은 새 모델로 돌지만,
    // 재사용 행에 새 모델명을 찍으면 "이 텍스트를 v2가 만들었다"는 거짓 기록이 된다.
    const store = makeStore();
    store.seed('file_a', '화자1: 예전 전사', 'fun-asr-old');
    const deps = makeDeps({ listStudents: twoMemosOneRecording(), ...store });
    await runBackfill(deps, { accounts: ['me'], asrModel: 'fun-asr-v2' });

    expect(deps.transcribe).not.toHaveBeenCalled();
    for (const call of store.insert.mock.calls) {
      const row = call[0];
      expect(row.asrModel).toBe('fun-asr-old');
      expect(row.transcript).toBe('화자1: 예전 전사');
    }
  });

  it('재사용은 ASR 예산(--limit)을 쓰지 않는다', async () => {
    const store = makeStore();
    const deps = makeDeps({ listStudents: twoMemosOneRecording(), ...store });
    const report = await runBackfill(deps, { accounts: ['me'], limit: 1 });

    expect(deps.transcribe).toHaveBeenCalledTimes(1);
    expect(report.inserted).toBe(2); // 두 번째는 과금이 없으므로 예산에 잡히지 않는다
    expect(report.remaining).toBe(0);
  });

  it('기존 전사 조회가 실패하면 그 건만 실패로 남기고 계속 간다', async () => {
    const findExisting = vi.fn().mockRejectedValueOnce(new Error('db down')).mockResolvedValue(null);
    const deps = makeDeps({ findExisting });
    const report = await runBackfill(deps, { accounts: ['me'] });

    expect(report.failed).toBe(1);
    expect(report.inserted).toBe(1);
    expect(report.failedEntries[0]).toMatchObject({ entryId: 'e1', error: 'db down' });
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

describe('runBackfill 시간 예산', () => {
  it('예산을 넘기면 새 전사를 시작하지 않고 남음으로 넘긴다', async () => {
    let clock = 0;
    const deps = makeDeps({
      // 첫 건이 예산을 다 쓴다
      transcribe: vi.fn(async () => {
        clock += 200_000;
        return '화자1: 전사';
      }),
    });
    const report = await runBackfill(deps, {
      accounts: ['me'],
      budgetMs: 150_000,
      now: () => clock,
    });

    expect(report.inserted).toBe(1);
    expect(report.remaining).toBe(1);
    expect(deps.transcribe).toHaveBeenCalledTimes(1);
  });

  it('예산이 남아 있으면 계속 처리한다', async () => {
    let clock = 0;
    const deps = makeDeps({
      transcribe: vi.fn(async () => {
        clock += 1_000;
        return '화자1: 전사';
      }),
    });
    const report = await runBackfill(deps, {
      accounts: ['me'],
      budgetMs: 150_000,
      now: () => clock,
    });

    expect(report.inserted).toBe(2);
    expect(report.remaining).toBe(0);
  });

  it('목록 조회가 예산을 다 쓰면 전사를 한 건도 시작하지 않는다', async () => {
    // 예산 시계는 함수 진입 시점부터 돈다. 목록 조회(students/call_transcripts/Plaud)에
    // 예산을 다 썼다면 새 전사를 시작해선 안 된다 — 시작하면 maxDuration을 넘겨
    // 그 배치의 성공분 리포트까지 통째로 날아간다.
    let clock = 0;
    const deps = makeDeps({
      listRecordings: vi.fn(async () => {
        clock += 200_000;
        return [recA, recB];
      }),
    });
    const report = await runBackfill(deps, {
      accounts: ['me'],
      budgetMs: 150_000,
      now: () => clock,
    });

    expect(deps.transcribe).not.toHaveBeenCalled();
    expect(report.inserted).toBe(0);
    expect(report.remaining).toBe(2);
    expect(report.budgetExhausted).toBe(true);
    expect(report.listingMs).toBeGreaterThanOrEqual(200_000);
  });

  it('시간으로 미룬 건과 limit으로 미룬 건을 구분해 보고한다', async () => {
    const byLimit = await runBackfill(makeDeps(), { accounts: ['me'], limit: 1 });
    expect(byLimit.remaining).toBe(1);
    expect(byLimit.budgetExhausted).toBe(false); // 시간이 아니라 예산 상한 때문이다

    let clock = 0;
    const byTime = await runBackfill(
      makeDeps({
        transcribe: vi.fn(async () => {
          clock += 200_000;
          return '화자1: 전사';
        }),
      }),
      { accounts: ['me'], budgetMs: 150_000, now: () => clock }
    );
    expect(byTime.remaining).toBe(1);
    expect(byTime.budgetExhausted).toBe(true);
  });

  it('총 소요 시간을 보고한다 — 클라이언트가 다음 배치를 판단할 근거', async () => {
    let clock = 0;
    const report = await runBackfill(
      makeDeps({
        transcribe: vi.fn(async () => {
          clock += 10_000;
          return '화자1: 전사';
        }),
      }),
      { accounts: ['me'], budgetMs: 150_000, now: () => clock }
    );

    expect(report.elapsedMs).toBe(20_000); // 2건 x 10s
  });
});
