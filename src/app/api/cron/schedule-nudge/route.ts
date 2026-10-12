import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { sendNudgeEmail } from '@/lib/nudge-email';

const NUDGE_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3시간
const COACH_LOOKBACK_DAYS = 30;
const PAGE = 1000;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const results = { students: 0, coaches: 0, skipped: 0, errors: 0 };

  try {
    const [students, coaches] = await Promise.all([
      fetchNudgeTargetStudents(now),
      fetchNudgeTargetCoaches(now),
    ]);

    const allTargets = [...students, ...coaches];
    if (!allTargets.length) {
      return NextResponse.json({ ok: true, ...results });
    }

    const profileIds = allTargets.map(t => t.sfv2ProfileId);
    const nudgeMap = await fetchNudgeStates(profileIds);

    for (const target of allTargets) {
      const state = nudgeMap.get(target.sfv2ProfileId + ':' + target.userType);
      const nextAllowed = state?.next_allowed_at ? new Date(state.next_allowed_at) : new Date(0);

      if (nextAllowed > now) {
        results.skipped++;
        continue;
      }

      try {
        await sendNudgeEmail(target);
        await upsertNudgeState(target, now);
        if (target.userType === 'student') results.students++;
        else results.coaches++;
      } catch (err) {
        console.error(`[schedule-nudge] 발송 실패: ${target.email}`, err);
        results.errors++;
      }
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    console.error('[schedule-nudge] 오류:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── 학생 탐색 ─────────────────────────────────────────────────────────────────

async function fetchNudgeTargetStudents(now: Date) {
  // 1. 재원 학생 목록
  const activeIds = new Set<string>();
  for (let offset = 0; ; offset += PAGE) {
    const { data } = await supabaseSFv2
      .from('payments')
      .select('student_id')
      .in('management_status', ['active', 'onboarding'])
      .not('student_id', 'is', null)
      .range(offset, offset + PAGE - 1);
    if (!data?.length) break;
    data.forEach(r => r.student_id && activeIds.add(r.student_id as string));
    if (data.length < PAGE) break;
  }
  if (!activeIds.size) return [];

  const profileIds = [...activeIds];

  // 2. 미래 세션 보유 여부 (coach_room / study_hall / vocab)
  const futureEvents: { id: string; category: string }[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, category')
      .in('category', ['coach_room', 'study_hall', 'vocab'])
      .neq('status', 'cancelled')
      .gte('starts_at', now.toISOString())
      .range(offset, offset + PAGE - 1);
    if (!data?.length) break;
    futureEvents.push(...data);
    if (data.length < PAGE) break;
  }

  const catById = new Map(futureEvents.map(e => [e.id, e.category]));
  const eventIds = futureEvents.map(e => e.id);

  const hasCategory = new Map<string, { coachRoom: boolean; studyHall: boolean; vocab: boolean }>();
  for (const id of profileIds) hasCategory.set(id, { coachRoom: false, studyHall: false, vocab: false });

  for (let i = 0; i < eventIds.length; i += 100) {
    const { data } = await supabaseSFv2
      .from('scheduled_event_participants')
      .select('event_id, user_id')
      .in('event_id', eventIds.slice(i, i + 100))
      .in('user_id', profileIds);
    for (const p of data ?? []) {
      const entry = hasCategory.get(p.user_id as string);
      if (!entry) continue;
      const cat = catById.get(p.event_id as string);
      if (cat === 'coach_room') entry.coachRoom = true;
      else if (cat === 'study_hall') entry.studyHall = true;
      else if (cat === 'vocab') entry.vocab = true;
    }
  }

  const needsNudge = profileIds.filter(id => {
    const c = hasCategory.get(id)!;
    return !c.coachRoom || !c.studyHall || !c.vocab;
  });
  if (!needsNudge.length) return [];

  // 3. 프로필 조회
  const profiles = await fetchProfiles(needsNudge);

  return needsNudge.flatMap(id => {
    const p = profiles.get(id);
    if (!p?.email) return [];
    const c = hasCategory.get(id)!;
    const missing = [
      !c.coachRoom && '코치룸',
      !c.studyHall && '스터디홀',
      !c.vocab && '보캡',
    ].filter(Boolean) as string[];
    return [{ sfv2ProfileId: id, name: p.full_name, email: p.email, userType: 'student' as const, missingItems: missing }];
  });
}

// ── 코치 탐색 ─────────────────────────────────────────────────────────────────

async function fetchNudgeTargetCoaches(now: Date) {
  const lookback = new Date(now.getTime() - COACH_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // 최근 30일 내 코치룸 세션을 가진 코치
  const recentCoaches = new Set<string>();
  for (let offset = 0; ; offset += PAGE) {
    const { data } = await supabaseSFv2
      .from('scheduled_events')
      .select('assigned_teacher_id')
      .eq('category', 'coach_room')
      .neq('status', 'cancelled')
      .gte('starts_at', lookback.toISOString())
      .not('assigned_teacher_id', 'is', null)
      .range(offset, offset + PAGE - 1);
    if (!data?.length) break;
    data.forEach(r => r.assigned_teacher_id && recentCoaches.add(r.assigned_teacher_id as string));
    if (data.length < PAGE) break;
  }
  if (!recentCoaches.size) return [];

  // 미래 코치룸 세션을 가진 코치
  const futureCoaches = new Set<string>();
  for (let offset = 0; ; offset += PAGE) {
    const { data } = await supabaseSFv2
      .from('scheduled_events')
      .select('assigned_teacher_id')
      .eq('category', 'coach_room')
      .neq('status', 'cancelled')
      .gte('starts_at', now.toISOString())
      .not('assigned_teacher_id', 'is', null)
      .range(offset, offset + PAGE - 1);
    if (!data?.length) break;
    data.forEach(r => r.assigned_teacher_id && futureCoaches.add(r.assigned_teacher_id as string));
    if (data.length < PAGE) break;
  }

  const needsNudge = [...recentCoaches].filter(id => !futureCoaches.has(id));
  if (!needsNudge.length) return [];

  const profiles = await fetchProfiles(needsNudge);

  return needsNudge.flatMap(id => {
    const p = profiles.get(id);
    if (!p?.email) return [];
    return [{ sfv2ProfileId: id, name: p.full_name, email: p.email, userType: 'coach' as const }];
  });
}

// ── 공통 헬퍼 ─────────────────────────────────────────────────────────────────

async function fetchProfiles(ids: string[]): Promise<Map<string, { full_name: string; email: string }>> {
  const map = new Map<string, { full_name: string; email: string }>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabaseSFv2
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids.slice(i, i + 100));
    for (const r of data ?? []) {
      if (r.id && r.full_name && r.email) map.set(r.id as string, { full_name: r.full_name as string, email: r.email as string });
    }
  }
  return map;
}

async function fetchNudgeStates(profileIds: string[]): Promise<Map<string, { next_allowed_at: string }>> {
  const map = new Map<string, { next_allowed_at: string }>();
  for (let i = 0; i < profileIds.length; i += 100) {
    const { data } = await supabaseSFv2
      .from('schedule_nudge_state')
      .select('sfv2_profile_id, user_type, next_allowed_at')
      .in('sfv2_profile_id', profileIds.slice(i, i + 100));
    for (const r of data ?? []) {
      map.set(`${r.sfv2_profile_id}:${r.user_type}`, { next_allowed_at: r.next_allowed_at as string });
    }
  }
  return map;
}

async function upsertNudgeState(
  target: { sfv2ProfileId: string; name: string; email: string; userType: 'student' | 'coach' },
  now: Date,
): Promise<void> {
  const nextAllowed = new Date(now.getTime() + NUDGE_INTERVAL_MS);
  await supabaseSFv2
    .from('schedule_nudge_state')
    .upsert({
      sfv2_profile_id: target.sfv2ProfileId,
      user_type: target.userType,
      email: target.email,
      name: target.name,
      last_sent_at: now.toISOString(),
      next_allowed_at: nextAllowed.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: 'sfv2_profile_id,user_type' });
}
