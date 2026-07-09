import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isAuthenticated } from '@/lib/server-auth';

export interface YesterdayCheckItem {
  eventId: string;
  category: 'coach_room' | 'study_hall' | 'vocab';
  startsAt: string;
  endsAt: string;
  student: { id: string; name: string };
  coach?: { id: string; name: string };
  // coach_room
  studentAttended?: boolean;
  hasFeedback?: boolean;
  // study_hall
  attended?: boolean;
  totalProblems?: number;
  accuracy?: number;
  // vocab
  vocabStudied?: boolean;
  wordCount?: number;
  masteredCount?: number;
  hasIssue: boolean;
}

export interface YesterdayCheckResponse {
  date: string;
  items: YesterdayCheckItem[];
  issueCount: number;
}

function kstDateToUtcRange(dateStr: string): { from: string; to: string } {
  const from = new Date(`${dateStr}T00:00:00+09:00`).toISOString();
  const to = new Date(`${dateStr}T23:59:59+09:00`).toISOString();
  return { from, to };
}

const VOCAB_MASTER_BOX = 5;

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = req.nextUrl.searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    const { from, to } = kstDateToUtcRange(date);

    // 1. 해당 날짜의 scheduled_events — approved/completed만 포함 (proposed/rejected/cancelled 제외)
    const { data: events, error: evErr } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, category, starts_at, ends_at, status, feedback')
      .in('category', ['coach_room', 'study_hall', 'vocab'])
      .gte('starts_at', from)
      .lte('starts_at', to)
      .in('status', ['approved', 'completed'])
      .order('starts_at', { ascending: true });

    if (evErr) throw new Error(evErr.message);
    if (!events?.length) return NextResponse.json({ date, items: [], issueCount: 0 } satisfies YesterdayCheckResponse);

    const eventIds = events.map((e) => e.id as string);

    // 2. 참가자 조회
    const { data: participants, error: pErr } = await supabaseSFv2
      .from('scheduled_event_participants')
      .select('event_id, user_id')
      .in('event_id', eventIds);

    if (pErr) throw new Error(pErr.message);

    const userIds = [...new Set((participants ?? []).map((p) => p.user_id as string))];

    // 3. 프로필 조회 (이름·역할)
    const { data: profiles, error: profErr } = await supabaseSFv2
      .from('profiles')
      .select('id, full_name, role')
      .in('id', userIds);

    if (profErr) throw new Error(profErr.message);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p as { id: string; full_name: string; role: string }]));

    // event_id → { students, coaches }
    const evParticipants = new Map<string, { students: { id: string; name: string }[]; coaches: { id: string; name: string }[] }>();
    for (const p of participants ?? []) {
      const ev = p.event_id as string;
      if (!evParticipants.has(ev)) evParticipants.set(ev, { students: [], coaches: [] });
      const profile = profileMap.get(p.user_id as string);
      if (!profile) continue;
      const entry = evParticipants.get(ev)!;
      if (profile.role === 'student') entry.students.push({ id: profile.id, name: profile.full_name });
      else if (profile.role === 'teacher') entry.coaches.push({ id: profile.id, name: profile.full_name });
    }

    // coach_room 이벤트 ID 목록
    const coachRoomEventIds = events.filter((e) => e.category === 'coach_room').map((e) => e.id as string);
    // study_hall 이벤트
    const studyHallEvents = events.filter((e) => e.category === 'study_hall');
    const studyHallEventIds = studyHallEvents.map((e) => e.id as string);
    // vocab 이벤트
    const vocabEvents = events.filter((e) => e.category === 'vocab');

    // 4. coach_room_session: scheduled_event_id 매칭 + 시간대 폴백
    // scheduled_event_id가 항상 세팅되지 않으므로, 날짜 범위 내 모든 세션을 가져와서 매칭
    const coachSessionMap = new Map<string, Set<string>>(); // event_id → Set<userId>
    if (coachRoomEventIds.length) {
      const allStudentIds = [...new Set(
        coachRoomEventIds.flatMap((eid) => evParticipants.get(eid)?.students.map((s) => s.id) ?? [])
      )];

      const { data: crSessions } = await supabaseSFv2
        .from('coach_room_session')
        .select('id, scheduled_event_id, user_id, started_at')
        .in('user_id', allStudentIds.length ? allStudentIds : ['__none__'])
        .gte('started_at', from)
        .lte('started_at', to)
        .not('ended_at', 'is', null);

      // event_id → 이벤트 시작시각 맵
      const eventStartMap = new Map<string, string>(
        events.filter((e) => e.category === 'coach_room').map((e) => [e.id as string, e.starts_at as string])
      );

      for (const s of crSessions ?? []) {
        const userId = s.user_id as string;
        const sessionStart = new Date(s.started_at as string).getTime();

        // 1차: scheduled_event_id 직접 매칭
        const linkedEid = s.scheduled_event_id as string | null;
        if (linkedEid && coachSessionMap.has(linkedEid) !== undefined && eventStartMap.has(linkedEid)) {
          if (!coachSessionMap.has(linkedEid)) coachSessionMap.set(linkedEid, new Set());
          coachSessionMap.get(linkedEid)!.add(userId);
          continue;
        }

        // 2차: 시간대 기준 매칭 — 이벤트 시작 시각 ±45분 이내
        for (const [eid, startsAt] of eventStartMap) {
          const eventStart = new Date(startsAt).getTime();
          const diff = Math.abs(sessionStart - eventStart);
          if (diff <= 45 * 60 * 1000) {
            // 해당 이벤트 참가자인지 확인
            const isParticipant = evParticipants.get(eid)?.students.some((st) => st.id === userId);
            if (isParticipant) {
              if (!coachSessionMap.has(eid)) coachSessionMap.set(eid, new Set());
              coachSessionMap.get(eid)!.add(userId);
              break;
            }
          }
        }
      }
    }

    // 5. study_hall_session: scheduled_event_id 매칭 + 시간대 폴백
    const shSessionMap = new Map<string, { sessionId: string; userId: string }[]>(); // event_id → sessions
    if (studyHallEventIds.length) {
      const shStudentIds = [...new Set(
        studyHallEventIds.flatMap((eid) => evParticipants.get(eid)?.students.map((s) => s.id) ?? [])
      )];

      const { data: shSessions } = await supabaseSFv2
        .from('study_hall_session')
        .select('id, scheduled_event_id, user_id, started_at')
        .in('user_id', shStudentIds.length ? shStudentIds : ['__none__'])
        .gte('started_at', from)
        .lte('started_at', to)
        .not('ended_at', 'is', null);

      const shEventStartMap = new Map<string, string>(
        studyHallEvents.map((e) => [e.id as string, e.starts_at as string])
      );

      for (const s of shSessions ?? []) {
        const userId = s.user_id as string;
        const sessionStart = new Date(s.started_at as string).getTime();

        // 1차: scheduled_event_id 직접 매칭
        const linkedEid = s.scheduled_event_id as string | null;
        if (linkedEid && shEventStartMap.has(linkedEid)) {
          if (!shSessionMap.has(linkedEid)) shSessionMap.set(linkedEid, []);
          shSessionMap.get(linkedEid)!.push({ sessionId: s.id as string, userId });
          continue;
        }

        // 2차: 시간대 기준 매칭 — 이벤트 시작 시각 ±45분 이내
        for (const [eid, startsAt] of shEventStartMap) {
          const eventStart = new Date(startsAt).getTime();
          if (Math.abs(sessionStart - eventStart) <= 45 * 60 * 1000) {
            const isParticipant = evParticipants.get(eid)?.students.some((st) => st.id === userId);
            if (isParticipant) {
              if (!shSessionMap.has(eid)) shSessionMap.set(eid, []);
              shSessionMap.get(eid)!.push({ sessionId: s.id as string, userId });
              break;
            }
          }
        }
      }
    }

    // 6. study_hall_unit_attempts 집계 (세션 ID 기준)
    const shAttemptMap = new Map<string, { total: number; correct: number }>(); // userId → stats
    const allShSessionIds = [...shSessionMap.values()].flat().map((s) => s.sessionId);
    if (allShSessionIds.length) {
      const { data: attempts } = await supabaseSFv2
        .from('study_hall_unit_attempts')
        .select('study_hall_session_id, student_id, is_correct')
        .in('study_hall_session_id', allShSessionIds);

      // session_id → userId 역매핑
      const sessionUserMap = new Map<string, string>();
      for (const sessions of shSessionMap.values()) {
        for (const s of sessions) sessionUserMap.set(s.sessionId, s.userId);
      }

      for (const a of attempts ?? []) {
        const userId = sessionUserMap.get(a.study_hall_session_id as string);
        if (!userId) continue;
        if (!shAttemptMap.has(userId)) shAttemptMap.set(userId, { total: 0, correct: 0 });
        const stat = shAttemptMap.get(userId)!;
        stat.total++;
        if (a.is_correct) stat.correct++;
      }
    }

    // 7. vocab.events (이벤트 시간대별)
    // vocab 이벤트 시간대에서 그룹별로 학생들의 학습 여부 확인
    const vocabStudyMap = new Map<string, { wordCount: number; masteredCount: number }>(); // userId → stats
    if (vocabEvents.length) {
      // 전체 vocab 이벤트의 시간 범위 (from ~ to)
      const allVocabStudentIds = [...new Set(
        vocabEvents.flatMap((e) => evParticipants.get(e.id as string)?.students.map((s) => s.id) ?? [])
      )];

      if (allVocabStudentIds.length) {
        const { data: vEvents } = await supabaseSFv2
          .schema('vocab')
          .from('events')
          .select('subject_id, entry_id, is_correct, prev_box, new_box, occurred_at')
          .in('subject_id', allVocabStudentIds)
          .eq('kind', 'graded')
          .gte('occurred_at', from)
          .lte('occurred_at', to);

        // 이벤트 시간대별 매핑: 각 vocab 이벤트의 starts_at~ends_at 범위 내 학습 여부
        // 단순화: 해당 날 전체 범위에서 학습 집계
        const entrySetPerUser = new Map<string, Set<string>>();
        const masteredPerUser = new Map<string, Set<string>>();

        for (const ve of vEvents ?? []) {
          const uid = ve.subject_id as string;
          if (!entrySetPerUser.has(uid)) entrySetPerUser.set(uid, new Set());
          if (!masteredPerUser.has(uid)) masteredPerUser.set(uid, new Set());

          const entryId = ve.entry_id as string | null;
          if (!entryId) continue;
          entrySetPerUser.get(uid)!.add(entryId);

          const prevBox = (ve.prev_box as number | null) ?? 0;
          const newBox = (ve.new_box as number | null) ?? 0;
          if (newBox >= VOCAB_MASTER_BOX && prevBox < VOCAB_MASTER_BOX) {
            masteredPerUser.get(uid)!.add(entryId);
          }
        }

        for (const [uid, entries] of entrySetPerUser) {
          vocabStudyMap.set(uid, {
            wordCount: entries.size,
            masteredCount: masteredPerUser.get(uid)?.size ?? 0,
          });
        }
      }
    }

    // 8. 결과 조립
    const items: YesterdayCheckItem[] = [];

    for (const ev of events) {
      const eid = ev.id as string;
      const category = ev.category as 'coach_room' | 'study_hall' | 'vocab';
      const participants = evParticipants.get(eid) ?? { students: [], coaches: [] };

      for (const student of participants.students) {
        const coach = participants.coaches[0]; // 코치는 보통 1명

        if (category === 'coach_room') {
          const arrivedSet = coachSessionMap.get(eid) ?? new Set();
          const studentAttended = arrivedSet.has(student.id);
          const hasFeedback = !!(ev.feedback as string | null);
          const hasIssue = !studentAttended || !hasFeedback;

          items.push({
            eventId: eid,
            category,
            startsAt: ev.starts_at as string,
            endsAt: ev.ends_at as string,
            student,
            coach,
            studentAttended,
            hasFeedback,
            hasIssue,
          });
        } else if (category === 'study_hall') {
          const shSessions = (shSessionMap.get(eid) ?? []).filter((s) => s.userId === student.id);
          const attended = shSessions.length > 0;
          const stats = shAttemptMap.get(student.id);
          const totalProblems = stats?.total ?? 0;
          const accuracy = stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
          const hasIssue = !attended;

          items.push({
            eventId: eid,
            category,
            startsAt: ev.starts_at as string,
            endsAt: ev.ends_at as string,
            student,
            attended,
            totalProblems: attended ? totalProblems : undefined,
            accuracy: attended ? accuracy : undefined,
            hasIssue,
          });
        } else if (category === 'vocab') {
          const vocabStats = vocabStudyMap.get(student.id);
          const vocabStudied = !!vocabStats && vocabStats.wordCount > 0;
          const hasIssue = !vocabStudied;

          items.push({
            eventId: eid,
            category,
            startsAt: ev.starts_at as string,
            endsAt: ev.ends_at as string,
            student,
            vocabStudied,
            wordCount: vocabStudied ? vocabStats!.wordCount : undefined,
            masteredCount: vocabStudied ? vocabStats!.masteredCount : undefined,
            hasIssue,
          });
        }
      }
    }

    const issueCount = items.filter((i) => i.hasIssue).length;
    return NextResponse.json({ date, items, issueCount } satisfies YesterdayCheckResponse);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
