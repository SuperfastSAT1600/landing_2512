// 코치 현황 — 코치별 수업 중 학생 명단. 순수 함수.
// 코치 ↔ 학생은 SFv2 활성 매칭(matchings.status='active')으로 잇는다.
// 단, 학생 × 과목에 최근 수업(RECENT_* 창, 취소 제외)이 있으면 그 수업을 연 코치만 담당 — 정리 안 된 옛 매칭을 걸러 낸다.
// 최근 수업이 없으면(막 매칭됨·공백) 매칭 코치로 두고 recent=false.
// 상태는 학생 × 매칭 과목의 payments.management_status(#533과 같은 기준). 과목 계정이 없으면 학생 롤업 상태.
import { rollUpSrmStatus } from '@/lib/srm-status';

export type RosterStatus = 'active' | 'onboarding' | 'paused';

export interface RosterInput {
  coaches: { slug: string; name: string; v2_user_id: string | null; is_active: boolean; sort_order: number | null; created_at: string }[];
  matchings: { id: string; status: string | null; subject: string | null }[];
  matchingTeachers: { matching_id: string; teacher_id: string; response: string | null }[];
  matchingStudents: { matching_id: string; student_id: string }[];
  /** 수락 코치가 없는 매칭 → 가장 최근 coach_room 담당 교사 */
  lastEventTeacher: Record<string, string>;
  /** 최근 수업 창 안의 coach_room 수업(취소 제외) */
  recentEvents: { matching_id: string; assigned_teacher_id: string | null }[];
  payments: { student_id: string | null; subject: string | null; management_status: string | null }[];
  /** SFv2 profiles 이름(학생·교사) */
  profileNames: Record<string, string | null>;
  crmStudents: { id: string; name: string; sfv2_profile_id: string | null }[];
}

export interface RosterStudent {
  profileId: string;
  crmStudentId: string | null;
  name: string;
  status: RosterStatus;
  /** 과목 중 하나라도 최근 수업이 있음 */
  recentLesson: boolean;
  subjects: { subject: string; status: RosterStatus; recent: boolean }[];
}

export interface RosterCoach {
  /** CRM slug, CRM에 없는 SRM 교사는 'v2:<profileId>' */
  key: string;
  slug: string | null;
  name: string;
  /** SRM 교사 계정과 연결됨 */
  linked: boolean;
  /** CRM coaches에 등록됨 */
  registered: boolean;
  activeCount: number;
  onboardingCount: number;
  pausedCount: number;
  students: RosterStudent[];
}

export interface CoachRoster { coaches: RosterCoach[]; unassigned: RosterStudent[] }

/** 최근 수업 창 — 이 안에 수업이 있으면 그 수업 코치만 담당 */
export const RECENT_PAST_DAYS = 28;
export const RECENT_AHEAD_DAYS = 14;
const ORDER: RosterStatus[] = ['active', 'onboarding', 'paused'];
const isRosterStatus = (s: string | null): s is RosterStatus => !!s && (ORDER as string[]).includes(s);

function byStatusThenName(a: RosterStudent, b: RosterStudent) {
  return ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.name.localeCompare(b.name, 'ko');
}

/** 학생 × 과목 → 상태. 과목 계정이 없으면 학생의 모든 계정 롤업 */
function statusLookup(payments: RosterInput['payments']) {
  const bySubject = new Map<string, string | null>();
  const byStudent = new Map<string, string[]>();
  for (const p of payments) {
    if (!p.student_id) continue;
    bySubject.set(`${p.student_id}|${p.subject}`, p.management_status);
    byStudent.set(p.student_id, [...(byStudent.get(p.student_id) ?? []), p.management_status ?? '']);
  }
  const rollup = (sid: string) => rollUpSrmStatus(byStudent.get(sid) ?? []);
  return {
    of: (sid: string, subject: string | null) => (bySubject.has(`${sid}|${subject}`) ? bySubject.get(`${sid}|${subject}`)! : rollup(sid)),
    rollup,
    students: () => [...byStudent.keys()],
  };
}

/** 활성 매칭 → 코치 교사 id들(수락 코치, 없으면 최근 담당) */
function coachesByMatching(input: RosterInput, activeIds: Set<string>) {
  const out = new Map<string, string[]>();
  for (const t of input.matchingTeachers) {
    if (t.response !== 'accepted' || !activeIds.has(t.matching_id)) continue;
    out.set(t.matching_id, [...(out.get(t.matching_id) ?? []), t.teacher_id]);
  }
  for (const id of activeIds) {
    if (!out.has(id) && input.lastEventTeacher[id]) out.set(id, [input.lastEventTeacher[id]]);
  }
  return out;
}

/** 학생|과목 → 최근 수업을 연 코치들(지정 담당 교사, 없으면 매칭 코치) */
function recentTeachers(input: RosterInput, subjectOf: Map<string, string | null>, teachersOf: Map<string, string[]>) {
  const studentsOf = new Map<string, string[]>();
  for (const ms of input.matchingStudents) studentsOf.set(ms.matching_id, [...(studentsOf.get(ms.matching_id) ?? []), ms.student_id]);
  const out = new Map<string, Set<string>>();
  for (const e of input.recentEvents) {
    if (!subjectOf.has(e.matching_id)) continue;
    const tids = e.assigned_teacher_id ? [e.assigned_teacher_id] : teachersOf.get(e.matching_id) ?? [];
    for (const sid of studentsOf.get(e.matching_id) ?? []) {
      const key = `${sid}|${subjectOf.get(e.matching_id)}`;
      const set = out.get(key) ?? new Set<string>();
      tids.forEach((t) => set.add(t));
      out.set(key, set);
    }
  }
  return out;
}

/** 직접 정한 순서(sort_order) → 순서 없는 코치는 뒤로, 등록순 */
export function compareCoachOrder(
  a: { sort_order: number | null; created_at: string }, b: { sort_order: number | null; created_at: string },
): number {
  if (a.sort_order !== b.sort_order) {
    if (a.sort_order === null) return 1;
    if (b.sort_order === null) return -1;
    return a.sort_order - b.sort_order;
  }
  return a.created_at.localeCompare(b.created_at);
}

export function buildCoachRoster(input: RosterInput): CoachRoster {
  const subjectOf = new Map(input.matchings.filter((m) => m.status === 'active').map((m) => [m.id, m.subject]));
  const teachersOf = coachesByMatching(input, new Set(subjectOf.keys()));
  const status = statusLookup(input.payments);
  const crmByProfile = new Map(input.crmStudents.filter((s) => s.sfv2_profile_id).map((s) => [s.sfv2_profile_id!, s]));
  const nameOf = (pid: string) => crmByProfile.get(pid)?.name ?? input.profileNames[pid] ?? '(이름 없음)';

  const recent = recentTeachers(input, subjectOf, teachersOf);

  // 교사 → 학생 → 과목별 상태
  type Cell = { status: RosterStatus; recent: boolean };
  const perTeacher = new Map<string, Map<string, Map<string, Cell>>>();
  const coached = new Set<string>();
  const place = (tid: string, sid: string, subject: string, cell: Cell) => {
    coached.add(sid);
    const students = perTeacher.get(tid) ?? new Map<string, Map<string, Cell>>();
    perTeacher.set(tid, students);
    const subjects = students.get(sid) ?? new Map<string, Cell>();
    students.set(sid, subjects);
    subjects.set(subject, cell);
  };
  for (const ms of input.matchingStudents) {
    if (!subjectOf.has(ms.matching_id)) continue;
    const raw = subjectOf.get(ms.matching_id) ?? null;
    const st = status.of(ms.student_id, raw);
    if (!isRosterStatus(st)) continue;
    const taught = recent.get(`${ms.student_id}|${raw}`);
    const tids = taught?.size ? [...taught] : teachersOf.get(ms.matching_id) ?? [];
    for (const tid of tids) place(tid, ms.student_id, raw ?? '과목 미지정', { status: st, recent: !!taught?.size });
  }

  const toStudent = (pid: string, subjects: Map<string, Cell>): RosterStudent => {
    const list = [...subjects].map(([subject, c]) => ({ subject, status: c.status, recent: c.recent })).sort((a, b) => a.subject.localeCompare(b.subject));
    return {
      profileId: pid, crmStudentId: crmByProfile.get(pid)?.id ?? null, name: nameOf(pid),
      status: rollUpSrmStatus(list.map((s) => s.status)) as RosterStatus, recentLesson: list.some((s) => s.recent), subjects: list,
    };
  };
  const card = (key: string, slug: string | null, name: string, tid: string | null, registered: boolean): RosterCoach => {
    const students = [...(tid ? perTeacher.get(tid) ?? [] : [])].map(([pid, subj]) => toStudent(pid, subj)).sort(byStatusThenName);
    const count = (s: RosterStatus) => students.filter((x) => x.status === s).length;
    return { key, slug, name, linked: !!tid, registered, activeCount: count('active'), onboardingCount: count('onboarding'), pausedCount: count('paused'), students };
  };

  const sorted = [...input.coaches].sort(compareCoachOrder);
  const registeredTeachers = new Set(input.coaches.map((c) => c.v2_user_id).filter(Boolean));
  const coaches = sorted
    .map((c) => card(c.slug, c.slug, c.name, c.v2_user_id, true))
    .filter((c, i) => sorted[i].is_active || c.students.length > 0);
  const outsiders = [...perTeacher.keys()].filter((tid) => !registeredTeachers.has(tid))
    .map((tid) => card(`v2:${tid}`, null, input.profileNames[tid] ?? '(이름 없음)', tid, false))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  const unassigned = status.students()
    .filter((pid) => !coached.has(pid))
    .flatMap((pid) => {
      const st = status.rollup(pid);
      return isRosterStatus(st) ? [{ profileId: pid, crmStudentId: crmByProfile.get(pid)?.id ?? null, name: nameOf(pid), status: st, recentLesson: false, subjects: [] }] : [];
    })
    .sort(byStatusThenName);

  return { coaches: [...coaches, ...outsiders], unassigned };
}
