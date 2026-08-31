/**
 * 전사 백필 실행 로직 (REQ-006).
 *
 * I/O는 전부 주입받는다 — 스크립트는 Supabase·Plaud·Qwen을 연결하기만 하고,
 * 순서·예산·실패 격리 같은 판단은 여기서 테스트 가능한 형태로 결정한다.
 *
 * 예산 원칙: ASR 호출만이 실제 비용이다. 매칭 실패·중복은 돈을 쓰기 전에 걸러내고,
 * `limit`은 "처리한 후보 수"가 아니라 "전사 시도 수"를 묶는다.
 */
import {
  PLAUD_ACCOUNTS,
  type PlaudFile,
  type PlaudRecording,
} from '@/lib/plaud-client';
import type { CallTranscriptInput } from '@/lib/call-transcripts';
import type { ConsultationEntry } from '@/types/crm';
import { matchRecording, selectBackfillCandidates } from '@/lib/plaud-backfill';

export interface StudentTimeline {
  id: string;
  consultation_timeline: ConsultationEntry[] | null;
}

export interface BackfillDeps {
  listStudents(): Promise<StudentTimeline[]>;
  /** 이미 전사가 있는 ConsultationEntry.id 집합. 본문은 읽지 않는다. */
  listCapturedEntryIds(): Promise<Set<string>>;
  listRecordings(accountKey: string): Promise<PlaudRecording[]>;
  getFile(fileId: string, accountKey: string): Promise<PlaudFile>;
  transcribe(audioUrl: string): Promise<string>;
  insert(input: CallTranscriptInput): Promise<void>;
  /**
   * 이 녹음의 전사가 이미 있으면 돌려준다. 한 녹음이 상담메모 여럿에 붙는 경우
   * (자매 학생 한 통화, 메모 중복 생성) 두 번째부터는 이 값을 재사용한다.
   */
  findExisting(
    source: 'plaud' | 'voip',
    externalId: string
  ): Promise<{ transcript: string; asrModel: string | null } | null>;
  log(message: string): void;
}

export interface BackfillOptions {
  dryRun?: boolean;
  /** 전사(=과금) 시도 상한. 미지정이면 무제한. */
  limit?: number;
  /** 조회할 Plaud 계정 키. 미지정이면 전체 로스터. */
  accounts?: string[];
  asrModel?: string;
  /**
   * 새 전사를 시작할 수 있는 시간 예산(ms). 초과분은 remaining으로 넘긴다.
   * 서버리스 실행 한도(maxDuration) 안에서 끝내기 위한 것 — 진행 중인 전사를
   * 중단하지는 않는다(중단하면 이미 쓴 ASR 비용이 버려진다).
   */
  budgetMs?: number;
  /** 테스트용 시계 주입. */
  now?: () => number;
}

export interface SkippedEntry {
  studentId: string;
  entryId: string;
  recordingName: string;
  reason: string;
}

export interface BackfillReport {
  candidates: number;
  skipped: number;
  inserted: number;
  wouldInsert: number;
  unmatched: number;
  ambiguous: number;
  failed: number;
  /** limit에 걸려 손대지 않은 매칭 건수 — 다음 실행에서 이어서 처리된다. */
  remaining: number;
  unmatchedEntries: SkippedEntry[];
  ambiguousEntries: SkippedEntry[];
  failedEntries: (SkippedEntry & { error: string })[];
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function runBackfill(
  deps: BackfillDeps,
  options: BackfillOptions = {}
): Promise<BackfillReport> {
  const accounts = options.accounts ?? PLAUD_ACCOUNTS.map((a) => a.key);
  const report: BackfillReport = {
    candidates: 0, skipped: 0, inserted: 0, wouldInsert: 0,
    unmatched: 0, ambiguous: 0, failed: 0, remaining: 0,
    unmatchedEntries: [], ambiguousEntries: [], failedEntries: [],
  };

  const captured = await deps.listCapturedEntryIds();
  const students = await deps.listStudents();

  const candidates = students.flatMap((s) =>
    selectBackfillCandidates(s.consultation_timeline, captured).map((c) => ({
      studentId: s.id,
      ...c,
    }))
  );
  report.candidates = candidates.length;
  report.skipped = countAlreadyCaptured(students, captured);

  // 후보가 없으면 Plaud를 부르지 않는다 — 토큰 회전·MCP 호출을 공짜로 쓰지 않기 위함.
  if (candidates.length === 0) return report;

  const recordings = await listAllRecordings(deps, accounts);

  const now = options.now ?? Date.now;
  const startedAt = now();
  const outOfTime = () => options.budgetMs !== undefined && now() - startedAt >= options.budgetMs;

  let budget = options.limit ?? Infinity;
  for (const c of candidates) {
    const where: SkippedEntry = {
      studentId: c.studentId,
      entryId: c.entryId,
      recordingName: c.header.recordingName,
      reason: '',
    };

    const match = matchRecording(c.header, recordings);
    if (match.status === 'unmatched') {
      report.unmatched++;
      report.unmatchedEntries.push({ ...where, reason: match.reason });
      continue;
    }
    if (match.status === 'ambiguous') {
      report.ambiguous++;
      report.ambiguousEntries.push({
        ...where,
        reason: `${match.candidates.length}건 후보 (${match.candidates.map((r) => r.id).join(', ')})`,
      });
      continue;
    }

    if (options.dryRun) {
      report.wouldInsert++;
      deps.log(`[dry-run] ${c.studentId} / ${c.entryId} ← ${match.recording.id}`);
      continue;
    }

    try {
      // 전사는 녹음의 속성이지 메모의 속성이 아니다. 같은 오디오를 두 번 살 이유가 없고,
      // 예산 차감보다 앞에 둬야 재사용 건이 남의 ASR 예산을 잡아먹지 않는다.
      const existing = await deps.findExisting('plaud', match.recording.id);
      if (existing) {
        await deps.insert(
          buildInput(c.studentId, c.entryId, match.recording, existing.transcript, existing.asrModel ?? undefined)
        );
        report.inserted++;
        deps.log(`[reuse] ${c.studentId} / ${c.entryId} ← ${match.recording.id} (전사 재사용)`);
        continue;
      }

      // 시간 예산도 --limit과 같은 자리에서 본다. 둘 다 "과금되는 전사"를 묶는
      // 값이므로, 위의 재사용 경로는 어느 쪽에도 걸리지 않는다.
      if (budget <= 0 || outOfTime()) {
        report.remaining++;
        continue;
      }
      budget--;

      await transcribeAndInsert(deps, c.studentId, c.entryId, match.recording, options.asrModel);
      report.inserted++;
      deps.log(`[ok] ${c.studentId} / ${c.entryId} ← ${match.recording.id}`);
    } catch (e) {
      // 한 건의 실패로 전체를 접지 않는다. 재실행하면 유니크 제약이 성공분을 걸러준다.
      report.failed++;
      report.failedEntries.push({ ...where, reason: 'error', error: errMsg(e) });
      deps.log(`[fail] ${c.studentId} / ${c.entryId}: ${errMsg(e)}`);
    }
  }

  return report;
}

/** 계정별 목록을 합친다. 한 계정이 죽어도 나머지는 진행한다(부분 성공이 전무보다 낫다). */
async function listAllRecordings(
  deps: BackfillDeps,
  accounts: string[]
): Promise<PlaudRecording[]> {
  const merged: PlaudRecording[] = [];
  for (const key of accounts) {
    try {
      const list = await deps.listRecordings(key);
      merged.push(...list.map((r) => ({ ...r, account_key: r.account_key ?? key })));
    } catch (e) {
      deps.log(`[warn] ${key} 녹음 목록 조회 실패 — 이 계정은 건너뛴다: ${errMsg(e)}`);
    }
  }
  return merged;
}

/** 녹음 메타데이터 → 삽입 페이로드. 전사·모델만 호출자가 정한다(신규 전사 vs 재사용). */
function buildInput(
  studentId: string,
  entryId: string,
  recording: PlaudRecording,
  transcript: string,
  asrModel?: string
): CallTranscriptInput {
  return {
    studentId,
    timelineEntryId: entryId,
    source: 'plaud',
    externalId: recording.id,
    ...(recording.name ? { recordingName: recording.name } : {}),
    ...(recording.start_at ? { recordedAt: recording.start_at } : {}),
    ...(typeof recording.duration === 'number'
      ? { durationSec: Math.round(recording.duration / 1000) }
      : {}),
    transcript,
    ...(asrModel ? { asrModel } : {}),
  };
}

async function transcribeAndInsert(
  deps: BackfillDeps,
  studentId: string,
  entryId: string,
  recording: PlaudRecording,
  asrModel?: string
): Promise<void> {
  const file = await deps.getFile(recording.id, recording.account_key ?? '');
  const transcript = await deps.transcribe(file.presigned_url);
  await deps.insert(buildInput(studentId, entryId, recording, transcript, asrModel));
}

/** 이미 전사가 있어 후보에서 빠진 Plaud 메모 수 — 재실행이 조용한 이유를 보여주는 값. */
function countAlreadyCaptured(students: StudentTimeline[], captured: Set<string>): number {
  let n = 0;
  for (const s of students) {
    for (const e of s.consultation_timeline ?? []) {
      if (captured.has(e.id) && selectBackfillCandidates([e], new Set()).length > 0) n++;
    }
  }
  return n;
}
