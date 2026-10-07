import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { kstDayRange, fetchCoachRoomBatch, fetchStudyHallBatch, fetchTestCenterBatch, fetchVocabBatch, fetchScheduleBatch } from '@/lib/learning-data';

export interface StudentDayRecord {
  date: string;
  coachRoom: { sessionCount: number; durationMinutes: number } | null;
  studyHall: { totalProblems: number } | null;
  vocab: { gradedCount: number } | null;
  testCenter: { totalProblems: number } | null;
  schedule: { coachRoom: boolean; studyHall: boolean; vocab: boolean };
}

export interface StudentDailyHistoryResponse {
  profileId: string;
  name: string;
  days: StudentDayRecord[];
}

function kstToday(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(`${from}T00:00:00+09:00`);
  const end = new Date(`${to}T00:00:00+09:00`);
  while (cur <= end) {
    dates.push(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get('profileId');
  const name = searchParams.get('name') ?? '';
  const today = kstToday();
  const to = searchParams.get('to') ?? today;
  const from = searchParams.get('from') ?? (() => {
    const d = new Date(`${today}T00:00:00+09:00`);
    d.setDate(d.getDate() - 29);
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(d);
  })();

  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 });

  try {
    const dates = dateRange(from, to);
    const pastDates = dates.filter(d => d < today);
    const isTodayIncluded = dates.includes(today);

    // Read cache for past dates
    const cacheRows: { date: string; coach_room: unknown; study_hall: unknown; vocab: unknown; test_center: unknown; schedule: unknown }[] = [];
    if (pastDates.length) {
      const { data } = await supabaseAdmin
        .from('srm_service_usage_cache')
        .select('date, coach_room, study_hall, vocab, test_center, schedule')
        .eq('sfv2_profile_id', profileId)
        .in('date', pastDates);
      if (data) cacheRows.push(...data);
    }

    const cachedByDate = new Map(cacheRows.map(r => [r.date as string, r]));
    const missedPastDates = pastDates.filter(d => !cachedByDate.has(d));

    // Fetch live for missed past dates + today
    const liveDates = [...missedPastDates, ...(isTodayIncluded ? [today] : [])];
    const liveByDate = new Map<string, Omit<StudentDayRecord, 'date'>>();

    await Promise.all(liveDates.map(async d => {
      const { start, end } = kstDayRange(d);
      const [crMap, shMap, tcMap, vcMap, schedMap] = await Promise.all([
        fetchCoachRoomBatch([profileId], start, end),
        fetchStudyHallBatch([profileId], start, end),
        fetchTestCenterBatch([profileId], start, end),
        fetchVocabBatch([profileId], start, end),
        fetchScheduleBatch([profileId], start, end),
      ]);
      const tc = tcMap.get(profileId) ?? [];
      const tcTotal = tc.reduce((s, t) => s + t.totalProblems, 0);
      const sh = shMap.get(profileId) ?? null;
      liveByDate.set(d, {
        coachRoom: crMap.get(profileId) ?? null,
        studyHall: sh ? { totalProblems: sh.totalProblems } : null,
        vocab: vcMap.get(profileId) ?? null,
        testCenter: tcTotal > 0 ? { totalProblems: tcTotal } : null,
        schedule: schedMap.get(profileId) ?? { coachRoom: false, studyHall: false, vocab: false },
      });
    }));

    // Cache newly fetched past dates
    if (missedPastDates.length) {
      const rows = missedPastDates
        .map(d => {
          const r = liveByDate.get(d);
          if (!r) return null;
          return {
            date: d,
            sfv2_profile_id: profileId,
            name,
            tutoring_status: 'unknown',
            schedule: r.schedule,
            coach_room: r.coachRoom,
            study_hall: r.studyHall,
            vocab: r.vocab,
            test_center: r.testCenter,
            cached_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);
      if (rows.length) {
        await supabaseAdmin
          .from('srm_service_usage_cache')
          .upsert(rows, { onConflict: 'date,sfv2_profile_id', ignoreDuplicates: true });
      }
    }

    const days: StudentDayRecord[] = dates.map(d => {
      if (cachedByDate.has(d)) {
        const r = cachedByDate.get(d)!;
        return {
          date: d,
          coachRoom: r.coach_room as StudentDayRecord['coachRoom'],
          studyHall: r.study_hall as StudentDayRecord['studyHall'],
          vocab: r.vocab as StudentDayRecord['vocab'],
          testCenter: r.test_center as StudentDayRecord['testCenter'],
          schedule: (r.schedule as StudentDayRecord['schedule']) ?? { coachRoom: false, studyHall: false, vocab: false },
        };
      }
      if (liveByDate.has(d)) {
        return { date: d, ...liveByDate.get(d)! };
      }
      return { date: d, coachRoom: null, studyHall: null, vocab: null, testCenter: null, schedule: { coachRoom: false, studyHall: false, vocab: false } };
    });

    return NextResponse.json({ profileId, name, days } satisfies StudentDailyHistoryResponse);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
