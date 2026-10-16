// 코치 현황 오른쪽 '매칭 정리 필요' — SRM에서 Deactivate해야 할 진행 중 매칭. 순수 함수.
// 같은 학생 × 과목에 진행 중 매칭이 여러 건일 때만 본다(코치 현황과 같은 재원·온보딩·휴원 학생).
// - 최근(recentCutoff 이후) 또는 예정 수업이 있는 매칭이 있으면, 나머지 매칭은 Deactivate 추천(stale)
// - 어느 매칭에도 없으면 어느 쪽을 남길지 사람이 정해야 함(unclear)
import { statusLookup, type RosterInput } from '@/lib/coach-roster';

export interface CleanupInput {
  input: RosterInput;
  /** 매칭별 마지막 지난 수업 · 다음 예정 수업(coach_room, 취소 제외) */
  lessons: Record<string, { last: string | null; next: string | null }>;
  meta: Record<string, { activated_at: string | null; entry_code: string | null }>;
  recentCutoff: string;
}

export interface CleanupMatching { matchingId: string; coach: string; activatedAt: string | null; lastLesson: string | null; entryCode: string | null }
interface StudentRef { profileId: string; student: string; crmStudentId: string | null; subject: string; status: string }
export type StaleItem = StudentRef & CleanupMatching & { keepCoaches: string[] };
export type UnclearGroup = StudentRef & { matchings: CleanupMatching[] };
export interface MatchingCleanup { stale: StaleItem[]; unclear: UnclearGroup[] }

const LISTED = new Set(['active', 'onboarding', 'paused']);

function namers(input: RosterInput) {
  const crmCoach = new Map(input.coaches.filter((c) => c.v2_user_id).map((c) => [c.v2_user_id!, c.name]));
  const crmStudent = new Map(input.crmStudents.filter((s) => s.sfv2_profile_id).map((s) => [s.sfv2_profile_id!, s]));
  const teachers = new Map<string, string[]>();
  for (const t of input.matchingTeachers) {
    if (t.response === 'accepted') teachers.set(t.matching_id, [...(teachers.get(t.matching_id) ?? []), t.teacher_id]);
  }
  const coachIds = (mid: string) => teachers.get(mid) ?? (input.lastEventTeacher[mid] ? [input.lastEventTeacher[mid]] : []);
  const coachName = (tid: string) => crmCoach.get(tid) ?? input.profileNames[tid] ?? '(이름 없음)';
  return {
    coachNames: (mid: string) => coachIds(mid).map(coachName),
    student: (sid: string) => ({ student: crmStudent.get(sid)?.name ?? input.profileNames[sid] ?? '(이름 없음)', crmStudentId: crmStudent.get(sid)?.id ?? null }),
  };
}

export function buildMatchingCleanup({ input, lessons, meta, recentCutoff }: CleanupInput): MatchingCleanup {
  const subjectOf = new Map(input.matchings.filter((m) => m.status === 'active').map((m) => [m.id, m.subject]));
  const status = statusLookup(input.payments);
  const name = namers(input);
  const groups = new Map<string, { sid: string; subject: string | null; mids: string[] }>();
  for (const ms of input.matchingStudents) {
    if (!subjectOf.has(ms.matching_id)) continue;
    const subject = subjectOf.get(ms.matching_id) ?? null;
    const key = `${ms.student_id}|${subject}`;
    const g = groups.get(key) ?? { sid: ms.student_id, subject, mids: [] };
    g.mids.push(ms.matching_id);
    groups.set(key, g);
  }

  const cutoff = Date.parse(recentCutoff);
  const isLive = (mid: string) => !!lessons[mid]?.next || (!!lessons[mid]?.last && Date.parse(lessons[mid].last!) >= cutoff);
  const describe = (mid: string): CleanupMatching => ({
    matchingId: mid, coach: name.coachNames(mid).join(', ') || '(코치 없음)', activatedAt: meta[mid]?.activated_at ?? null,
    lastLesson: lessons[mid]?.last ?? null, entryCode: meta[mid]?.entry_code ?? null,
  });
  const byActivated = (a: CleanupMatching, b: CleanupMatching) => (a.activatedAt ?? '').localeCompare(b.activatedAt ?? '');

  const stale: StaleItem[] = [];
  const unclear: UnclearGroup[] = [];
  for (const { sid, subject, mids } of groups.values()) {
    const st = status.of(sid, subject);
    if (mids.length < 2 || !LISTED.has(st ?? '')) continue;
    const ref: StudentRef = { profileId: sid, ...name.student(sid), subject: subject ?? '과목 미지정', status: st! };
    const live = mids.filter(isLive);
    if (!live.length) { unclear.push({ ...ref, matchings: mids.map(describe).sort(byActivated) }); continue; }
    const keepCoaches = [...new Set(live.flatMap(name.coachNames))];
    if (!keepCoaches.length) keepCoaches.push('(코치 없음)');
    for (const m of mids.filter((mid) => !live.includes(mid)).map(describe).sort(byActivated)) stale.push({ ...ref, ...m, keepCoaches });
  }
  const byStudent = (a: StudentRef, b: StudentRef) => a.student.localeCompare(b.student, 'ko') || a.subject.localeCompare(b.subject);
  return { stale: stale.sort(byStudent), unclear: unclear.sort(byStudent) };
}
