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

// 현재 단계: 출석/지각/결석만 자동 감지
// - 출석(early/on_time): 스케줄 시작 시간 기준 5분 이내 접속
// - 지각(late): 스케줄 시작 5분 초과 후 접속
// - 결석(absent): 스케줄 종료 시간까지 접속 이력 없음
function suggestStatus(
  sessions: { started_at: string; ended_at: string | null }[],
  eventStartsAt: string,
  eventEndsAt: string,
  _eventType: 'study_hall' | 'vocab',
): SessionStatus | null {
  const now = Date.now();
  const eventStart = new Date(eventStartsAt).getTime();
  const LATE_THRESHOLD_MS = 5 * 60 * 1000;

  if (sessions.length === 0) {
    if (now > new Date(eventEndsAt).getTime()) return 'absent';
    return null;
  }

  const firstJoin = Math.min(...sessions.map((s) => new Date(s.started_at).getTime()));
  const isEarly = firstJoin < eventStart;
  const isLate = !isEarly && firstJoin > eventStart + LATE_THRESHOLD_MS;

  if (isEarly) return 'early';
  return isLate ? 'late' : 'on_time';
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
    const vocabFromRaw = vocabEvents.length
      ? vocabEvents.reduce((m, e) => (e.startsAt < m ? e.startsAt : m), vocabEvents[0].startsAt)
      : null;
    // 빠른출석 감지를 위해 이벤트 시작 15분 전부터 조회
    const vocabFrom = vocabFromRaw
      ? new Date(new Date(vocabFromRaw).getTime() - 15 * 60 * 1000).toISOString()
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
            .gte('occurred_at', vocabFrom)
            .lte('occurred_at', vocabTo)
            .order('occurred_at', { ascending: true })
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

    // vocab activity: event_id → user_id → { firstAt, lastAt }
    const vocabTimingMap = new Map<string, Map<string, { firstAt: string; lastAt: string }>>();
    for (const activity of vocabResult.data ?? []) {
      const userId = activity.subject_id as string;
      const occurredAt = new Date(activity.occurred_at as string).getTime();
      for (const ev of vocabEvents) {
        const start = new Date(ev.startsAt).getTime();
        const end = new Date(ev.endsAt).getTime();
        if (occurredAt >= start - 15 * 60 * 1000 && occurredAt <= end && ev.studentIds.includes(userId)) {
          if (!vocabTimingMap.has(ev.id)) vocabTimingMap.set(ev.id, new Map());
          const userMap = vocabTimingMap.get(ev.id)!;
          const existing = userMap.get(userId);
          if (!existing) {
            userMap.set(userId, { firstAt: activity.occurred_at as string, lastAt: activity.occurred_at as string });
          } else {
            if (occurredAt < new Date(existing.firstAt).getTime()) existing.firstAt = activity.occurred_at as string;
            if (occurredAt > new Date(existing.lastAt).getTime()) existing.lastAt = activity.occurred_at as string;
          }
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
        // vocab: 이벤트 시간대 내 최초 활동 시각으로 early/on_time/late/absent 판단
        const timingMap = vocabTimingMap.get(ev.id);
        const LATE_THRESHOLD_MS = 5 * 60 * 1000;
        const eventStart = new Date(ev.startsAt).getTime();
        const isVocabEventEnded = Date.now() > new Date(ev.endsAt).getTime();
        const suggestions: V2SessionSuggestion[] = ev.studentIds.map((studentId) => {
          const timing = timingMap?.get(studentId);
          if (!timing) {
            const suggestedStatus = isVocabEventEnded ? 'absent' : null;
            return { studentId, suggestedStatus, joinedAt: null, lastEndedAt: null, sessionCount: 0 };
          }
          const firstJoin = new Date(timing.firstAt).getTime();
          const isEarly = firstJoin < eventStart;
          const isLate = !isEarly && firstJoin > eventStart + LATE_THRESHOLD_MS;
          const suggestedStatus = isEarly ? 'early' : isLate ? 'late' : 'on_time';
          return {
            studentId,
            suggestedStatus,
            joinedAt: timing.firstAt,
            lastEndedAt: timing.lastAt,
            sessionCount: 1,
          };
        });
        return { eventId: ev.id, eventType: 'vocab', suggestions };
      }
    });

    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: String(e) } }, { status: 500 });
  }
}
