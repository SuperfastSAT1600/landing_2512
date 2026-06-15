import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';

export interface V2Summary {
  recentSessions: Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
  }>;
  studyHallCount30d: number;
  testScores: Array<{
    submitted_at: string;
    score: number;
    total: number;
    curriculum_title?: string;
  }>;
  package: {
    remaining_sessions: number | null;
    total_sessions: number | null;
    status: string | null;
  } | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;

  const [sessionsResult, studyHallResult, testScoresResult, packageResult] = await Promise.allSettled([
    fetchRecentSessions(profileId),
    fetchStudyHallCount30d(profileId),
    fetchTestScores(profileId),
    fetchPackage(profileId),
  ]);

  const summary: V2Summary = {
    recentSessions: sessionsResult.status === 'fulfilled' ? sessionsResult.value : [],
    studyHallCount30d: studyHallResult.status === 'fulfilled' ? studyHallResult.value : 0,
    testScores: testScoresResult.status === 'fulfilled' ? testScoresResult.value : [],
    package: packageResult.status === 'fulfilled' ? packageResult.value : null,
  };

  return NextResponse.json(summary);
}

async function fetchRecentSessions(profileId: string) {
  const { data: participantRows, error: pErr } = await supabaseSFv2
    .from('scheduled_event_participants')
    .select('event_id')
    .eq('user_id', profileId);

  if (pErr || !participantRows?.length) return [];

  const eventIds = participantRows.map((r: { event_id: string }) => r.event_id);

  const { data: events, error: eErr } = await supabaseSFv2
    .from('scheduled_events')
    .select('id, starts_at, ends_at, status')
    .in('id', eventIds)
    .eq('category', 'coach_room')
    .order('starts_at', { ascending: false })
    .limit(10);

  if (eErr) throw new Error(eErr.message);

  return (events ?? []).map((e: { id: string; starts_at: string; ends_at: string; status: string }) => ({
    id: e.id,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    status: e.status,
  }));
}

async function fetchStudyHallCount30d(profileId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabaseSFv2
    .from('study_hall_session')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profileId)
    .gte('started_at', since);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchTestScores(profileId: string) {
  // 1. test_center_session으로 session IDs 조회
  const { data: sessions, error: sErr } = await supabaseSFv2
    .from('test_center_session')
    .select('id')
    .eq('user_id', profileId);

  if (sErr || !sessions?.length) return [];

  const sessionIds = sessions.map((s: { id: string }) => s.id);

  // 2. curriculum_attempts 조회
  const { data: currAttempts, error: caErr } = await supabaseSFv2
    .from('test_center_curriculum_attempts')
    .select('id')
    .in('session_id', sessionIds)
    .eq('status', 'submitted');

  if (caErr || !currAttempts?.length) return [];

  const currAttemptIds = currAttempts.map((ca: { id: string }) => ca.id);

  // 3. lesson_attempts 조회 (score IS NOT NULL)
  const { data: lessonAttempts, error: laErr } = await supabaseSFv2
    .from('test_center_lesson_attempts')
    .select('submitted_at, score, total, curriculum_attempt_id')
    .in('curriculum_attempt_id', currAttemptIds)
    .eq('status', 'submitted')
    .not('score', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(5);

  if (laErr) throw new Error(laErr.message);

  return (lessonAttempts ?? []).map((la: { submitted_at: string; score: number; total: number }) => ({
    submitted_at: la.submitted_at,
    score: la.score,
    total: la.total,
  }));
}

async function fetchPackage(profileId: string) {
  const { data, error } = await supabaseSFv2
    .from('packages')
    .select('remaining_sessions, total_sessions, status')
    .eq('student_id', profileId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    remaining_sessions: (data as { remaining_sessions: number | null }).remaining_sessions ?? null,
    total_sessions: (data as { total_sessions: number | null }).total_sessions ?? null,
    status: (data as { status: string | null }).status ?? null,
  };
}
