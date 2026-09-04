/**
 * 세일즈 콜 전사 → IntelligentFunctions 코퍼스 행 (REQ-001 ~ REQ-004, REQ-101 ~ REQ-105).
 *
 * 한 학생 = 한 행인 이유: pack의 corpus 선언은 경로 하나를 가리킨다
 * (`corpus: { text: "transcript", label: "outcome" }`). 그러므로 여러 통화는 텍스트
 * 컬럼 하나에 합쳐져야 하고, 통화 경계는 본문 안의 헤더로만 표시할 수 있다.
 *
 * 순수 함수다 — Supabase도 파일도 만지지 않는다. 스크립트가 읽어온 행을 넘기면
 * 행과 통계를 돌려준다. 어떤 통화가 들어갈지는 `select-calls.ts`가 정한다.
 */
import { redact } from './redact';
import {
  emptyStats,
  OUTCOME_BY_STAGE,
  type CorpusRow,
  type BuildStats,
  type CallInput,
  type StudentInput,
} from './corpus-types';
import { resolveCutoff, selectCalls } from './select-calls';

export type { StudentInput, CallInput, CorpusRow, BuildStats, Outcome } from './corpus-types';

/**
 * KST `YYYY-MM-DD HH:mm`. 로케일 포맷터 대신 UTC+9 산술을 쓰는 이유는 결정성이다 —
 * `toLocaleString`의 출력은 런타임 ICU 버전에 따라 달라지고, 코퍼스 본문은 재현 가능해야 한다.
 */
function toKst(iso: string): string {
  const shifted = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  return shifted.toISOString().slice(0, 16).replace('T', ' ');
}

/** 통화들을 헤더로 구분해 하나의 본문으로 렌더한다. 이미 비식별된 전사를 받는다. */
function renderCalls(calls: CallInput[], redacted: string[]): string {
  return calls
    .map((call, i) => {
      const parts = [`통화 ${i + 1}`, `${toKst(call.recorded_at ?? call.created_at)} KST`];
      if (call.duration_sec) parts.push(`${Math.round(call.duration_sec / 60)}분`);
      parts.push(call.source);
      return `=== ${parts.join(' · ')} ===\n${redacted[i].trim()}`;
    })
    .join('\n\n');
}

export function buildCorpus(
  students: StudentInput[],
  calls: CallInput[]
): { rows: CorpusRow[]; stats: BuildStats } {
  const byStudent = new Map<string, CallInput[]>();
  for (const call of calls) {
    const bucket = byStudent.get(call.student_id);
    if (bucket) bucket.push(call);
    else byStudent.set(call.student_id, [call]);
  }

  const rows: CorpusRow[] = [];
  const stats = emptyStats(students.length);

  for (const student of students) {
    const outcome = OUTCOME_BY_STAGE[student.funnel_stage];
    if (!outcome) {
      stats.excludedNoLabel += 1;
      continue;
    }

    const cutoff = resolveCutoff(student);
    if (cutoff === null) stats.cutoffUnavailable += 1;

    const kept = selectCalls(byStudent.get(student.id) ?? [], cutoff, stats);
    if (!kept) continue;

    const redacted = kept.map((call) => {
      const { text, count } = redact(call.transcript, { studentName: student.name });
      stats.redactions += count;
      return text;
    });

    rows.push({
      student_id: student.id,
      transcript: renderCalls(kept, redacted),
      outcome,
      grade: student.grade,
      school_type: student.school_type,
      desired_subjects: student.desired_subjects,
      target_score: student.target_score,
      previous_rw_score: student.previous_rw_score,
      previous_math_score: student.previous_math_score,
      call_count: kept.length,
      total_duration_sec: kept.reduce((sum, c) => sum + (c.duration_sec ?? 0), 0),
    });
    stats[outcome] += 1;
  }

  stats.rows = rows.length;
  return { rows, stats };
}
