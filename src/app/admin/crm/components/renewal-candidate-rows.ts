// 재결제 후보 행 전개 — 학생 1행이 아니라 (학생 × 과목) 1행이 목록의 단위다.
// 플랫폼 V2 Payment 페이지가 같은 단위로 보여주고, 실무자는 "SAT는 남았고 special은 소진"을
// 그 화면에서 판단한다. 학생 단위로 합치면 그 구분이 사라진다.

import type { SubjectHours, SubjectKey } from '@/lib/tutoring-subject-breakdown';
import type { TutoringEntry, TutoringRowStudent } from './TutoringStudentRow';

export interface CandidateRow extends TutoringEntry<TutoringRowStudent> {
  /** 이 행의 과목. 과목 내역이 없는 학생(SRM 미연결 등)은 null. */
  subject: SubjectKey;
}

function rowFromSubject(
  entry: TutoringEntry<TutoringRowStudent>,
  breakdown: SubjectHours
): CandidateRow {
  const { subject, paymentStatus, ...hours } = breakdown;
  return {
    ...entry,
    subject,
    hours,
    // 잔여는 0 하한 표시용 — 학생 단위 값과 같은 규칙.
    remainingHours: Math.max(0, hours.remaining),
    // 배지·필터가 이 행의 과목만 보게 한다.
    subjects: subject ? [subject] : [],
    paymentStatus,
  };
}

/**
 * 과목 내역이 있으면 과목마다 한 행, 없으면 학생 단위 1행.
 * 정렬·그룹 묶음은 표가 맡으므로 여기서는 입력 순서를 유지한다.
 */
export function expandSubjectRows(entries: TutoringEntry<TutoringRowStudent>[]): CandidateRow[] {
  return entries.flatMap((entry) =>
    entry.bySubject.length > 0
      ? entry.bySubject.map((breakdown) => rowFromSubject(entry, breakdown))
      : [{ ...entry, subject: null }]
  );
}

/** 학생당 첫 행만 — 서브탭 카운트가 과목 수만큼 부풀지 않게 사람 단위로 되돌린다. */
export function dedupeByStudent(rows: CandidateRow[]): CandidateRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.student.id)) return false;
    seen.add(row.student.id);
    return true;
  });
}

/** 행이 아니라 사람 수 — 'n / m명' 카운트는 학생 기준을 유지한다. */
export function countStudents(rows: CandidateRow[]): number {
  return dedupeByStudent(rows).length;
}
