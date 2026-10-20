import { RENEWAL_OPEN_STAGES, RENEWAL_STAGE_LABELS, type RenewalTarget } from '@/types/crm';
import { getWeekLabel } from '@/lib/week-definitions';

// 재결제 후보 목록에 안 나오는 학생과 그 이유 — 재결제를 놓치지 않도록 패널에서 드러낸다.
// 후보 = SRM 결제 계정(튜터링 목록) − 진행 중 타깃이므로, 빠지는 경우는
// ① 이미 진행 중 ② CRM 수강인데 SRM 계정 미연결 ③ 계정은 있는데 SRM 결제·수강 상태 없음.

export type HiddenReason = 'in_pipeline' | 'no_srm_link' | 'no_srm_payment';

export interface HiddenCandidate {
  studentId: string;
  name: string;
  reason: HiddenReason;
  /** 진행 중이면 '주차 단계(단계명)', 나머지는 빈 문자열 — 조치 문구는 사유별로 화면이 붙인다. */
  detail: string;
}

/** CRM lead_status=enrolled 학생 중 필요한 칸만. */
export interface EnrolledRef {
  id: string;
  name: string;
  sfv2_profile_id: string | null;
}

interface Input {
  entries: { student: { id: string } }[];
  /** 후보 소스에 들어간 SRM 계정 — 같은 계정을 쓰는 CRM 중복 행이 '결제 미등록'으로 오판되지 않게 한다. */
  listedProfileIds: string[];
  openTargets: RenewalTarget[];
  enrolled: EnrolledRef[];
}

const OPEN = new Set(RENEWAL_OPEN_STAGES);

function pipelineDetail(t: RenewalTarget): string {
  const week = getWeekLabel(t.week_start) ?? t.week_start;
  return `${week} ${t.stage}단계(${RENEWAL_STAGE_LABELS[t.stage]})`;
}

export function findHiddenCandidates({ entries, listedProfileIds, openTargets, enrolled }: Input): HiddenCandidate[] {
  const nameById = new Map(enrolled.map((s) => [s.id, s.name]));
  const out = new Map<string, HiddenCandidate>();

  // 최신 주차가 먼저 오도록 — 같은 학생의 여러 열린 행 중 가장 최근 것을 보여 준다
  const open = openTargets
    .filter((t) => OPEN.has(t.stage) && !t.carried_to_week)
    .sort((a, b) => b.week_start.localeCompare(a.week_start));
  for (const t of open) {
    if (out.has(t.student_id)) continue;
    const name = t.student?.name ?? nameById.get(t.student_id) ?? '(이름 없음)';
    out.set(t.student_id, { studentId: t.student_id, name, reason: 'in_pipeline', detail: pipelineDetail(t) });
  }

  const listed = new Set(entries.map((e) => e.student.id));
  const listedProfiles = new Set(listedProfileIds);
  for (const s of enrolled) {
    if (listed.has(s.id) || out.has(s.id)) continue;
    if (s.sfv2_profile_id && listedProfiles.has(s.sfv2_profile_id)) continue;
    const reason: HiddenReason = s.sfv2_profile_id ? 'no_srm_payment' : 'no_srm_link';
    out.set(s.id, { studentId: s.id, name: s.name, reason, detail: '' });
  }

  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export function matchHidden(list: HiddenCandidate[], query: string): HiddenCandidate[] {
  const q = query.trim().toLowerCase();
  return q ? list.filter((h) => h.name.toLowerCase().includes(q)) : list;
}
