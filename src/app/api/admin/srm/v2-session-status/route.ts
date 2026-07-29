import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isAuthenticated } from '@/lib/server-auth';
import type { SessionStatus } from '../session-status/route';

export interface V2SessionSuggestion {
  studentId: string;
  suggestedStatus: SessionStatus | null;
  joinedAt: string | null;
  lastEndedAt: string | null;
  sessionCount: number;
}

export interface V2SessionStatusItem {
  eventId: string;
  eventType: 'study_hall' | 'vocab';
  suggestions: V2SessionSuggestion[];
}

interface EventInfo {
  id: string;
  eventType: 'study_hall' | 'vocab';
  startsAt: string;
  endsAt: string;
  studentIds: string[];
}

function suggestStatus(
  sessions: { started_at: string; ended_at: string | null }[],
  eventStartsAt: string,
  eventEndsAt: string,
  eventType: 'study_hall' | 'vocab',
): SessionStatus | null {
  if (sessions.length === 0) return null;

  const now = Date.now();
  const eventStart = new Date(eventStartsAt).getTime();
  const eventEnd = new Date(eventEndsAt).getTime();
  const LATE_THRESHOLD_MS = 5 * 60 * 1000;

  const sorted = [...sessions].sort((a, b) =>
    new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const firstJoin = new Date(first.started_at).getTime();
  const lastEnded = last.ended_at ? new Date(last.ended_at).getTime() : null;

  const isEarly = firstJoin < eventStart;
  const isLate = !isEarly && firstJoin > eventStart + LATE_THRESHOLD_MS;
  const isEventOngoing = now >= eventStart && now <= eventEnd;

  if (lastEnded === null) {
    // 현재 세션 진행 중
    if (isEarly) return 'early';
    return isLate ? 'late' : 'on_time';
  }

  if (isEventOngoing) {
    // 세션 종료됐는데 이벤트는 아직 진행 중 → 이탈
    if (eventType === 'vocab') return null; // vocab은 세션 단위 추적 불가
    return 'disconnected';
  }

  // 이벤트 종료 후
  if (isEarly) return 'early';
  return isLate ? 'late' : 'completed';
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const eventsParam = req.nextUrl.searchParams.get('events');
    if (!eventsParam) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'events param required (JSON array)' } },
        { status: 400 },
      );
    }

    let events: EventInfo[];
    try {
      events = JSON.parse(eventsParam) as EventInfo[];
    } catch {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'events must be valid JSON' } }, { status: 400 });
    }

    const shEvents = events.filter((e) => e.eventType === 'study_hall');
    const vocabEvents = events.filter((e) => e.eventType === 'vocab');

    const allShEventIds = shEvents.map((e) => e.id);
    const allShStudentIds = [...new Set(shEvents.flatMap((e) => e.studentIds))];

    const allVocabStudentIds = [...new Set(vocabEvents.flatMap((e) => e.studentIds))];
    const vocabFrom = vocabEvents.length
      ? vocabEvents.reduce((m, e) => (e.startsAt < m ? e.startsAt : m), vocabEvents[0].startsAt)
      : null;
    const vocabTo = vocabEvents.length
      ? vocabEvents.reduce((m, e) => (e.endsAt > m ? e.endsAt : m), vocabEvents[0].endsAt)
      : null;

    const [shResult, vocabResult] = await Promise.all([
      allShStudentIds.length && allShEventIds.length
        ? supabaseSFv2
            .from('study_hall_session')
            .select('id, scheduled_event_id, user_id, started_at, ended_at')
            .in('user_id', allShStudentIds)
            .gte('started_at', new Date(new Date(shEvents.reduce((m, e) => (e.startsAt < m ? e.startsAt : m), shEvents[0].startsAt)).getTime() - 60 * 60 * 1000).toISOString())
            .lte('started_at', shEvents.reduce((m, e) => (e.endsAt > m ? e.endsAt : m), shEvents[0].endsAt))
        : Promise.resolve({ data: [], error: null }),

      allVocabStudentIds.length && vocabFrom && vocabTo
        ? supabaseSFv2
            .schema('vocab')
            .from('events')
            .select('subject_id, occurred_at')
            .in('subject_id', allVocabStudentIds)
            .eq('kind', 'graded')
            .gte('occurred_at', vocabFrom)
            .lte('occurred_at', vocabTo)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // study_hall sessions: event_id → user_id → sessions[]
    const shSessionMap = new Map<string, Map<string, { started_at: string; ended_at: string | null }[]>>();

    for (const session of shResult.data ?? []) {
      const linkedEventId = session.scheduled_event_id as string | null;
      const userId = session.user_id as string;

      let matchedEventId: string | null = null;
      if (linkedEventId && allShEventIds.includes(linkedEventId)) {
        matchedEventId = linkedEventId;
      } else {
        // 시간대 기준 매칭: 이벤트 시작 60분 전부터 종료 시까지 세션 시작이 포함되면 매칭
        const sessionStart = new Date(session.started_at as string).getTime();
        for (const ev of shEvents) {
          const eventStart = new Date(ev.startsAt).getTime();
          const eventEnd = new Date(ev.endsAt).getTime();
          if (
            sessionStart >= eventStart - 60 * 60 * 1000 &&
            sessionStart <= eventEnd &&
            ev.studentIds.includes(userId)
          ) {
            matchedEventId = ev.id;
            break;
          }
        }
      }

      if (!matchedEventId) continue;
      if (!shSessionMap.has(matchedEventId)) shSessionMap.set(matchedEventId, new Map());
      const userMap = shSessionMap.get(matchedEventId)!;
      if (!userMap.has(userId)) userMap.set(userId, []);
      userMap.get(userId)!.push({ started_at: session.started_at as string, ended_at: session.ended_at as string | null });
    }

    // vocab activity: event_id → user_id → has activity
    const vocabActivityMap = new Map<string, Set<string>>(); // eventId → studentIds with activity
    for (const activity of vocabResult.data ?? []) {
      const userId = activity.subject_id as string;
      const occurredAt = new Date(activity.occurred_at as string).getTime();
      for (const ev of vocabEvents) {
        const start = new Date(ev.startsAt).getTime();
        const end = new Date(ev.endsAt).getTime();
        if (occurredAt >= start && occurredAt <= end && ev.studentIds.includes(userId)) {
          if (!vocabActivityMap.has(ev.id)) vocabActivityMap.set(ev.id, new Set());
          vocabActivityMap.get(ev.id)!.add(userId);
        }
      }
    }

    const result: V2SessionStatusItem[] = events.map((ev) => {
      if (ev.eventType === 'study_hall') {
        const userMap = shSessionMap.get(ev.id);
        const suggestions: V2SessionSuggestion[] = ev.studentIds.map((studentId) => {
          const sessions = userMap?.get(studentId) ?? [];
          const sorted = [...sessions].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
          return {
            studentId,
            suggestedStatus: suggestStatus(sessions, ev.startsAt, ev.endsAt, 'study_hall'),
            joinedAt: sorted[0]?.started_at ?? null,
            lastEndedAt: sorted[sorted.length - 1]?.ended_at ?? null,
            sessionCount: sessions.length,
          };
        });
        return { eventId: ev.id, eventType: 'study_hall', suggestions };
      } else {
        // vocab
        const activeSet = vocabActivityMap.get(ev.id);
        const suggestions: V2SessionSuggestion[] = ev.studentIds.map((studentId) => ({
          studentId,
          suggestedStatus: activeSet?.has(studentId) ? 'on_time' : null,
          joinedAt: null,
          lastEndedAt: null,
          sessionCount: 0,
        }));
        return { eventId: ev.id, eventType: 'vocab', suggestions };
      }
    });

    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: String(e) } }, { status: 500 });
  }
}
