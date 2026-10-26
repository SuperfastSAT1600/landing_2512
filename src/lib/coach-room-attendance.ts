// 코치룸 접속 기록(coach_room_session)으로 수업이 실제로 열렸는지 판단한다. 순수 함수.
// SRM은 관리자가 '완료' 처리해야 시간이 차감돼, 처리가 늦으면 실제로 한 수업이 '예정'으로 남는다.
// 접속 기록은 "했다"는 근거로는 믿을 만하지만, 기록이 없다고 "안 했다"고 단정할 수는 없다
// (최근 2개월 완료 수업의 86%만 기록 충족).

export interface RoomSession { matching_id: string | null; role: string; started_at: string; ended_at: string | null }

/** 수업 시각 앞뒤 여유 — 일찍 들어오거나 늦게 끝나는 수업. 판정도 끝난 뒤 이만큼 지나서 한다 */
export const WINDOW_PAD_MS = 30 * 60_000;

type Span = [number, number];

function mergedSpans(spans: Span[]): Span[] {
  const sorted = spans.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out: Span[] = [];
  for (const [a, b] of sorted) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** 수업 창(시작 −30분 ~ 끝 +30분) 안에서 코치와 학생이 함께 접속해 있던 분 */
export function togetherMinutes(
  lesson: { matchingId: string; startsAt: string; endsAt: string },
  sessions: RoomSession[],
): number {
  const lo = new Date(lesson.startsAt).getTime() - WINDOW_PAD_MS;
  const hi = new Date(lesson.endsAt).getTime() + WINDOW_PAD_MS;
  const spansOf = (role: string) => mergedSpans(
    sessions
      .filter((s) => s.matching_id === lesson.matchingId && s.role === role && s.ended_at)
      .map((s): Span => [Math.max(lo, new Date(s.started_at).getTime()), Math.min(hi, new Date(s.ended_at!).getTime())]),
  );
  const teacher = spansOf('teacher');
  const student = spansOf('student');
  let ms = 0;
  for (const [a, b] of teacher) for (const [c, d] of student) ms += Math.max(0, Math.min(b, d) - Math.max(a, c));
  return Math.round(ms / 60_000);
}

/** 함께 있던 시간이 20분 이상(짧은 수업은 길이의 절반 이상)이면 수업이 열린 것으로 본다 */
export function attendanceHeld(together: number, lessonMinutes: number): boolean {
  return together > 0 && together >= Math.min(20, lessonMinutes / 2);
}

/** 끝나고 여유 시간(30분)이 지나야 지난 수업 — 늦게 끝나는 수업·아직 열린 접속을 기다린다 */
export function isPastLesson(endsAt: string, now: number): boolean {
  return new Date(endsAt).getTime() + WINDOW_PAD_MS <= now;
}

/** 아직 닫히지 않은 접속은 지금까지 있던 것으로 본다(수업 창으로 잘리므로 오래 열린 접속도 과대 집계되지 않는다) */
export function closeOpenSessions(sessions: RoomSession[], now: string): RoomSession[] {
  return sessions.map((s) => (s.ended_at ? s : { ...s, ended_at: now }));
}

/** SRM 완료 처리는 안 됐지만 접속 기록으로 실제 열린 것이 확인된 지난 수업의 id */
export function heldLessonIds(
  lessons: { id: string; matching_id: string; status: string; starts_at: string; ends_at: string }[],
  sessions: RoomSession[],
  now: string,
): Set<string> {
  const nowMs = new Date(now).getTime();
  const closed = closeOpenSessions(sessions, now);
  const out = new Set<string>();
  for (const l of lessons) {
    if (l.status === 'completed' || !isPastLesson(l.ends_at, nowMs)) continue;
    const minutes = (new Date(l.ends_at).getTime() - new Date(l.starts_at).getTime()) / 60_000;
    const together = togetherMinutes({ matchingId: l.matching_id, startsAt: l.starts_at, endsAt: l.ends_at }, closed);
    if (attendanceHeld(together, minutes)) out.add(l.id);
  }
  return out;
}
