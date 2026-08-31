/**
 * 세일즈 콜 전사 → IntelligentFunctions 코퍼스 행 (REQ-001 ~ REQ-004).
 *
 * 한 학생 = 한 행인 이유: pack의 corpus 선언은 경로 하나를 가리킨다
 * (`corpus: { text: "transcript", label: "outcome" }`). 그러므로 여러 통화는 텍스트
 * 컬럼 하나에 합쳐져야 하고, 통화 경계는 본문 안의 헤더로만 표시할 수 있다.
 *
 * 순수 함수다 — Supabase도 파일도 만지지 않는다. 스크립트가 읽어온 행을 넘기면
 * 행과 통계를 돌려준다.
 */
import { redact } from './redact';

export interface StudentInput {
  id: string;
  name: string;
  funnel_stage: string;
  funnel_stage_updated_at: string | null;
  stage_history: Array<{ stage: string; label: string; entered_at: string }> | null;
  grade: string | null;
  school_type: string | null;
  desired_subjects: string | null;
  target_score: number | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
}

export interface CallInput {
  student_id: string;
  source: 'plaud' | 'voip';
  recorded_at: string | null;
  created_at: string;
  duration_sec: number | null;
  transcript: string;
}

export type Outcome = 'converted' | 'lost';

/** Parquet 컬럼과 1:1. 중첩 없이 평면 — 선언도 읽기도 단순해진다. */
export interface CorpusRow {
  student_id: string;
  transcript: string;
  outcome: Outcome;
  grade: string | null;
  school_type: string | null;
  desired_subjects: string | null;
  target_score: number | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
  call_count: number;
  total_duration_sec: number;
}

export interface BuildStats {
  students: number;
  rows: number;
  converted: number;
  lost: number;
  /** 아직 결과가 확정되지 않아 제외된 학생. */
  excludedNoLabel: number;
  /** 통화가 없거나, 절단 후 남은 통화가 없어 제외된 학생. */
  excludedNoCalls: number;
  /** 절단 근거가 없어 누출 위험을 안고 통과시킨 학생. 0이 아니면 확인이 필요하다. */
  cutoffUnavailable: number;
  redactions: number;
}

/** 결제 완료 / 이탈. 그 외 단계는 아직 결과가 아니다. */
const OUTCOME_BY_STAGE: Record<string, Outcome> = { '9': 'converted', churned: 'lost' };

const at = (call: CallInput): number => new Date(call.recorded_at ?? call.created_at).getTime();

/**
 * KST `YYYY-MM-DD HH:mm`. 로케일 포맷터 대신 UTC+9 산술을 쓰는 이유는 결정성이다 —
 * `toLocaleString`의 출력은 런타임 ICU 버전에 따라 달라지고, 코퍼스 본문은 재현 가능해야 한다.
 */
function toKst(iso: string): string {
  const shifted = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  return shifted.toISOString().slice(0, 16).replace('T', ' ');
}

/**
 * 결과가 확정된 시각. 이후의 통화에는 결과가 그대로 등장하므로 학습에서 빼야 한다.
 * `stage_history`에 같은 단계가 여러 번이면 가장 이른 진입이 확정 시점이다.
 * 근거가 없으면 `null` — 호출자가 절단하지 않고 통계로 보고한다.
 */
export function resolveCutoff(student: StudentInput): number | null {
  const entered = (student.stage_history ?? [])
    .filter((e) => OUTCOME_BY_STAGE[e.stage] !== undefined)
    .map((e) => new Date(e.entered_at).getTime())
    .filter((t) => Number.isFinite(t));
  if (entered.length > 0) return Math.min(...entered);
  if (student.funnel_stage_updated_at) {
    const t = new Date(student.funnel_stage_updated_at).getTime();
    if (Number.isFinite(t)) return t;
  }
  return null;
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
  const stats: BuildStats = {
    students: students.length,
    rows: 0,
    converted: 0,
    lost: 0,
    excludedNoLabel: 0,
    excludedNoCalls: 0,
    cutoffUnavailable: 0,
    redactions: 0,
  };

  for (const student of students) {
    const outcome = OUTCOME_BY_STAGE[student.funnel_stage];
    if (!outcome) {
      stats.excludedNoLabel += 1;
      continue;
    }

    const cutoff = resolveCutoff(student);
    if (cutoff === null) stats.cutoffUnavailable += 1;

    const kept = (byStudent.get(student.id) ?? [])
      .filter((call) => cutoff === null || at(call) <= cutoff)
      .sort((a, b) => at(a) - at(b));
    if (kept.length === 0) {
      stats.excludedNoCalls += 1;
      continue;
    }

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
