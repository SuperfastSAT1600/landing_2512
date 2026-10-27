import {
  RENEWAL_OPEN_STAGES,
  RENEWAL_STAGES,
  type RenewalStage,
  type RenewalTarget,
  type RenewalWeeklyStat,
  type Student,
} from '@/types/crm';
import { getCurrentWeekDef } from '@/lib/week-definitions';
import type { RenewalCardTutoring } from '../RenewalCard';
import { sortByNextContact } from '../renewal-sort';
import type { TutoringEntry } from '../TutoringStudentRow';
import { withHeld } from '../renewal-candidate-rows';

export function buildTutoringByStudentId(
  entries: TutoringEntry<Student>[]
): Map<string, RenewalCardTutoring> {
  const map = new Map<string, RenewalCardTutoring>();
  for (const e of entries) {
    // 재결제 후보 표·학생 카드와 같은 실제 진행 기준 — 수업은 했지만 SRM 완료 처리 전인 시간을
    // 예약에서 완료로 옮긴다. 초과예약(잔여 − 예약)은 그대로다.
    const held = Math.round(e.bySubject.reduce((sum, b) => sum + b.held, 0) * 10) / 10;
    const hours = e.hours ? withHeld(e.hours, held) : null;
    map.set(e.student.id, {
      displayStatus: e.displayStatus,
      // 카드는 0으로 깎지 않은 값을 쓴다 — 초과 사용(-3h)이 재결제 시급도의 핵심 신호다.
      remainingHours: hours ? hours.remaining : null,
      scheduledHours: hours ? hours.scheduled : null,
      overscheduledHours: hours?.overscheduled ?? null,
      heldHours: hours ? held : 0,
    });
  }
  return map;
}

export function groupTargetsByStage(targets: RenewalTarget[]): Map<RenewalStage, RenewalTarget[]> {
  const map = new Map<RenewalStage, RenewalTarget[]>();
  for (const stage of RENEWAL_STAGES) map.set(stage, []);
  for (const target of targets) map.get(target.stage)?.push(target);
  // 진행 단계만 임박순으로 다시 세운다 — 터미널(4·5)은 결과 기록이라 서버 정렬
  // (stage_updated_at DESC, 최근 확정순)이 그대로 맞다.
  for (const stage of RENEWAL_OPEN_STAGES) {
    map.set(stage, sortByNextContact(map.get(stage) ?? []));
  }
  return map;
}

// 주차 셀렉터 후보 — 이번 주차 + 데이터가 있는 최근 주차
export function buildWeekOptions(weekly: RenewalWeeklyStat[], nowMs: number): string[] {
  const thisWeek = getCurrentWeekDef(new Date(nowMs))?.start;
  const starts = new Set(weekly.map((w) => w.week_start));
  if (thisWeek) starts.add(thisWeek);
  return [...starts].sort((a, b) => b.localeCompare(a));
}
