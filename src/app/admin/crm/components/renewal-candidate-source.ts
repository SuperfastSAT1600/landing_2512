import { RENEWAL_OPEN_STAGES, type RenewalStage, type RenewalTarget } from '@/types/crm';
import {
  compareTutoringUrgency,
  type TutoringEntry,
  type TutoringRowStudent,
} from './TutoringStudentRow';

const OPEN_STAGES = new Set<RenewalStage>(RENEWAL_OPEN_STAGES);

/**
 * 재결제 후보 — '튜터링 중' 목록에서 이미 파이프라인에 열려 있는 학생만 뺀다.
 * 학생 소스와 종료 학생 제외는 classifyTutoringEntries가 담당하므로, 여기서는
 * 재결제 고유 규칙만 본다: 열린 타깃(1~3) 중복 방지 + 연락 우선순위 정렬.
 *
 * 4(결제 완료)·5(미전환)는 종결된 코호트이므로 다음 주차에 다시 선정할 수 있다.
 */
export function getRenewalCandidates<S extends TutoringRowStudent>(
  entries: TutoringEntry<S>[],
  targets: RenewalTarget[]
): TutoringEntry<S>[] {
  // carried_to_week 가 찍힌 행은 다음 주차로 넘어가 종결됐다 — 그 주차 기준으로는
  // 열린 대상이 아니다. API(scope=open)도 같은 조건으로 거르지만, 순수 함수가
  // 자기 완결적이어야 호출부가 바뀌어도 규칙이 어긋나지 않는다.
  const openStudentIds = new Set(
    targets
      .filter((t) => OPEN_STAGES.has(t.stage) && !t.carried_to_week)
      .map((t) => t.student_id)
  );

  return entries
    .filter((entry) => !openStudentIds.has(entry.student.id))
    .slice()
    .sort(compareTutoringUrgency);
}
