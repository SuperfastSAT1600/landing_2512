import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';

export function kstDayRange(date: string): { start: string; end: string } {
  const start = new Date(`${date}T00:00:00+09:00`).toISOString();
  const end   = new Date(`${date}T23:59:59.999+09:00`).toISOString();
  return { start, end };
}

export interface StudyHallResult {
  durationMinutes: number;
  totalProblems: number;
  correctCount: number;
  accuracy: number;
  skills: Array<{ skill: string; domain: string; correct: number; total: number }>;
}

export interface TestCenterResult {
  curriculumTitle?: string;
  curriculumDomain?: string;
  totalScore: number;
  totalProblems: number;
  lessons: Array<{ title?: string; score: number; total: number }>;
}

export interface VocabResult {
  wordCount: number;
  gradedCount: number;
  correctCount: number;
  accuracy: number;
  masteredCount: number;
  missedTerms: string[];
}

export interface StudentDayResult {
  name: string;
  crmStudentId: string;
  sfv2ProfileId: string | null;
  isActive?: boolean;
  studyHall: StudyHallResult | null;
  testCenter: TestCenterResult[];
  vocab: VocabResult | null;
}

export interface DailyLearningResponse {
  date: string;
  students: StudentDayResult[];
}

// ── Per-student helpers (public API, kept for direct use) ─────────────────────

export async function fetchStudyHall(profileId: string, start: string, end: string): Promise<StudyHallResult | null> {
  const map = await fetchStudyHallBatch([profileId], start, end);
  return map.get(profileId) ?? null;
}

export async function fetchTestCenter(profileId: string, start: string, end: string): Promise<TestCenterResult[]> {
  const map = await fetchTestCenterBatch([profileId], start, end);
  return map.get(profileId) ?? [];
}

export async function fetchVocab(profileId: string, start: string, end: string): Promise<VocabResult | null> {
  const map = await fetchVocabBatch([profileId], start, end);
  return map.get(profileId) ?? null;
}

// ── Batch helpers (N students → fixed number of queries) ─────────────────────

async function fetchStudyHallBatch(profileIds: string[], start: string, end: string): Promise<Map<string, StudyHallResult | null>> {
  if (!profileIds.length) return new Map();

  const { data: sessions } = await supabaseSFv2
    .from('study_hall_session')
    .select('id, user_id, started_at, ended_at')
    .in('user_id', profileIds)
    .gte('started_at', start)
    .lte('started_at', end)
    .not('ended_at', 'is', null);

  if (!sessions?.length) return new Map(profileIds.map(id => [id, null]));

  const sessionIds = sessions.map((s: { id: string }) => s.id);

  const { data: attempts } = await supabaseSFv2
    .from('study_hall_unit_attempts')
    .select('study_hall_session_id, student_id, is_correct, unit_id')
    .in('study_hall_session_id', sessionIds);

  const unitIds = [...new Set((attempts ?? []).map((a: { unit_id: string }) => a.unit_id).filter(Boolean))];
  const { data: unitsMeta } = unitIds.length
    ? await supabaseSFv2.from('units').select('id, skill, domain').in('id', unitIds)
    : { data: [] };

  const unitsMap = new Map<string, { skill: string; domain: string }>();
  for (const u of unitsMeta ?? []) {
    if (u.id && u.skill) unitsMap.set(u.id as string, { skill: u.skill as string, domain: (u.domain as string) ?? '' });
  }

  // Group sessions by user
  const sessionsByUser = new Map<string, Array<{ id: string; started_at: string; ended_at: string }>>();
  for (const s of sessions) {
    const uid = s.user_id as string;
    if (!sessionsByUser.has(uid)) sessionsByUser.set(uid, []);
    sessionsByUser.get(uid)!.push(s as { id: string; started_at: string; ended_at: string });
  }

  // Group attempts by session
  const attemptsBySession = new Map<string, Array<{ is_correct: boolean; unit_id: string | null }>>();
  for (const a of attempts ?? []) {
    const sid = a.study_hall_session_id as string;
    if (!attemptsBySession.has(sid)) attemptsBySession.set(sid, []);
    attemptsBySession.get(sid)!.push({ is_correct: a.is_correct as boolean, unit_id: a.unit_id as string | null });
  }

  const result = new Map<string, StudyHallResult | null>();

  for (const profileId of profileIds) {
    const userSessions = sessionsByUser.get(profileId) ?? [];
    if (!userSessions.length) { result.set(profileId, null); continue; }

    let totalMinutes = 0;
    let totalProblems = 0;
    let correctCount = 0;
    const skillMap = new Map<string, { skill: string; domain: string; correct: number; total: number }>();

    for (const s of userSessions) {
      if (s.ended_at) {
        totalMinutes += Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
      }
      for (const a of attemptsBySession.get(s.id) ?? []) {
        totalProblems++;
        if (a.is_correct) correctCount++;
        const meta = a.unit_id ? unitsMap.get(a.unit_id) : undefined;
        if (meta?.skill) {
          if (!skillMap.has(meta.skill)) skillMap.set(meta.skill, { skill: meta.skill, domain: meta.domain, correct: 0, total: 0 });
          const sk = skillMap.get(meta.skill)!;
          sk.total++;
          if (a.is_correct) sk.correct++;
        }
      }
    }

    result.set(profileId, {
      durationMinutes: totalMinutes,
      totalProblems,
      correctCount,
      accuracy: totalProblems > 0 ? Math.round((correctCount / totalProblems) * 100) : 0,
      skills: Array.from(skillMap.values()),
    });
  }

  return result;
}

async function fetchTestCenterBatch(profileIds: string[], start: string, end: string): Promise<Map<string, TestCenterResult[]>> {
  if (!profileIds.length) return new Map();

  const { data: sessions } = await supabaseSFv2
    .from('test_center_session')
    .select('id, user_id, started_at')
    .in('user_id', profileIds)
    .gte('started_at', start)
    .lte('started_at', end);

  if (!sessions?.length) return new Map(profileIds.map(id => [id, []]));

  const sessionIds = sessions.map((s: { id: string }) => s.id);

  const { data: attempts } = await supabaseSFv2
    .from('test_center_lesson_attempts')
    .select('test_center_session_id, student_id, score, total, lesson_id, curriculum_id')
    .in('test_center_session_id', sessionIds)
    .not('score', 'is', null);

  if (!attempts?.length) return new Map(profileIds.map(id => [id, []]));

  const lessonIds = [...new Set(attempts.map((a: { lesson_id: string }) => a.lesson_id).filter(Boolean))];
  const curriculumIds = [...new Set(attempts.map((a: { curriculum_id: string }) => a.curriculum_id).filter(Boolean))];

  const [{ data: lessons }, { data: curricula }] = await Promise.all([
    lessonIds.length ? supabaseSFv2.from('lessons').select('id, title').in('id', lessonIds) : { data: [] },
    curriculumIds.length ? supabaseSFv2.from('curricula').select('id, title, domain').in('id', curriculumIds) : { data: [] },
  ]);

  const lessonTitleMap = new Map<string, string>();
  for (const l of lessons ?? []) if (l.id && l.title) lessonTitleMap.set(l.id as string, l.title as string);
  const curriculumMap = new Map<string, { title: string; domain: string }>();
  for (const c of curricula ?? []) if (c.id && c.title) curriculumMap.set(c.id as string, { title: c.title as string, domain: (c.domain as string) ?? '' });

  // Map session → user
  const sessionUserMap = new Map<string, string>();
  for (const s of sessions) sessionUserMap.set(s.id as string, s.user_id as string);

  // Group attempts by session
  const bySession = new Map<string, TestCenterResult>();
  for (const a of attempts) {
    const sid = a.test_center_session_id as string;
    if (!bySession.has(sid)) {
      const currId = a.curriculum_id as string | undefined;
      const curriculum = currId ? curriculumMap.get(currId) : undefined;
      bySession.set(sid, { curriculumTitle: curriculum?.title, curriculumDomain: curriculum?.domain, totalScore: 0, totalProblems: 0, lessons: [] });
    }
    const tcResult = bySession.get(sid)!;
    const lessonId = a.lesson_id as string | undefined;
    const score = a.score as number;
    const total = a.total as number;
    tcResult.lessons.push({ title: lessonId ? lessonTitleMap.get(lessonId) : undefined, score, total });
    tcResult.totalScore += score;
    tcResult.totalProblems += total;
  }

  // Group by user
  const result = new Map<string, TestCenterResult[]>();
  for (const profileId of profileIds) result.set(profileId, []);
  for (const [sid, tcResult] of bySession) {
    const userId = sessionUserMap.get(sid);
    if (userId) result.get(userId)?.push(tcResult);
  }

  return result;
}

async function fetchVocabBatch(profileIds: string[], start: string, end: string): Promise<Map<string, VocabResult | null>> {
  const VOCAB_MASTER_BOX = 5;
  const VOCAB_MAX_MISSED = 6;

  if (!profileIds.length) return new Map();

  const { data: events } = await supabaseSFv2
    .schema('vocab')
    .from('events')
    .select('subject_id, entry_id, is_correct, prev_box, new_box, occurred_at')
    .in('subject_id', profileIds)
    .eq('kind', 'graded')
    .gte('occurred_at', start)
    .lte('occurred_at', end);

  if (!events?.length) return new Map(profileIds.map(id => [id, null]));

  // Group events by user
  const eventsByUser = new Map<string, typeof events>();
  for (const e of events) {
    const uid = e.subject_id as string;
    if (!eventsByUser.has(uid)) eventsByUser.set(uid, []);
    eventsByUser.get(uid)!.push(e);
  }

  // Collect all missed entry IDs across all users
  const allMissedIds = new Set<string>();
  for (const userEvents of eventsByUser.values()) {
    for (const e of userEvents) {
      if (e.is_correct === false && e.entry_id) allMissedIds.add(e.entry_id as string);
    }
  }

  const missedIdsList = [...allMissedIds];
  const { data: vocabEntries } = missedIdsList.length
    ? await supabaseSFv2.schema('vocab').from('entries').select('id, term').in('id', missedIdsList)
    : { data: [] };

  const termMap = new Map<string, string>();
  for (const en of vocabEntries ?? []) if (en.id && en.term) termMap.set(en.id as string, en.term as string);

  const result = new Map<string, VocabResult | null>();

  for (const profileId of profileIds) {
    const userEvents = eventsByUser.get(profileId);
    if (!userEvents?.length) { result.set(profileId, null); continue; }

    const entryIds = new Set<string>();
    let gradedCount = 0;
    let correctCount = 0;
    const masteredIds = new Set<string>();
    const missedIds: string[] = [];

    for (const e of userEvents) {
      const entryId = e.entry_id as string | null;
      if (!entryId) continue;
      entryIds.add(entryId);
      gradedCount++;
      if (e.is_correct === true) correctCount++;
      if (e.is_correct === false) missedIds.push(entryId);
      const prevBox = (e.prev_box as number | null) ?? 0;
      const newBox = (e.new_box as number | null) ?? 0;
      if (newBox >= VOCAB_MASTER_BOX && prevBox < VOCAB_MASTER_BOX) masteredIds.add(entryId);
    }

    const uniqueMissedIds = [...new Set(missedIds)].slice(0, VOCAB_MAX_MISSED);
    result.set(profileId, {
      wordCount: entryIds.size,
      gradedCount,
      correctCount,
      accuracy: gradedCount > 0 ? Math.round((correctCount / gradedCount) * 100) : 0,
      masteredCount: masteredIds.size,
      missedTerms: uniqueMissedIds.map(id => termMap.get(id)).filter((t): t is string => Boolean(t)),
    });
  }

  return result;
}

// ── Public aggregation functions ──────────────────────────────────────────────

export async function fetchDailyLearning(names: string[], date: string): Promise<DailyLearningResponse> {
  const { start, end } = kstDayRange(date);

  let query = supabaseAdmin
    .from('students')
    .select('id, name, portal_name, sfv2_profile_id')
    .eq('lead_status', 'enrolled')
    .order('name');

  if (names.length) query = query.in('name', names);

  const { data: students, error } = await query;
  if (error) throw new Error(error.message);

  const profileIds = (students ?? []).map(s => s.sfv2_profile_id as string).filter(Boolean);

  const [studyHallMap, testCenterMap, vocabMap] = await Promise.all([
    fetchStudyHallBatch(profileIds, start, end),
    fetchTestCenterBatch(profileIds, start, end),
    fetchVocabBatch(profileIds, start, end),
  ]);

  const internalNames = (students ?? []).map(s => s.name as string);
  const results: StudentDayResult[] = (students ?? []).map(s => {
    const profileId = s.sfv2_profile_id as string | null;
    const displayName = (s.portal_name as string | null) || (s.name as string);
    if (!profileId) {
      return { name: displayName, crmStudentId: s.id as string, sfv2ProfileId: null, studyHall: null, testCenter: [], vocab: null };
    }
    return {
      name: displayName,
      crmStudentId: s.id as string,
      sfv2ProfileId: profileId,
      studyHall: studyHallMap.get(profileId) ?? null,
      testCenter: testCenterMap.get(profileId) ?? [],
      vocab: vocabMap.get(profileId) ?? null,
    };
  });

  const ordered = names.length
    ? names.map(n => results.find((_, i) => internalNames[i] === n)).filter((r): r is StudentDayResult => Boolean(r))
    : results;

  return { date, students: ordered };
}

export async function fetchB2BDailyLearning(partnerName: string, date: string): Promise<DailyLearningResponse> {
  const { start, end } = kstDayRange(date);

  const { data: students, error } = await supabaseAdmin
    .from('students')
    .select('id, name, portal_name, sfv2_profile_id, lead_status')
    .eq('b2b_partner', partnerName)
    .order('name');

  if (error) throw new Error(error.message);

  const profileIds = (students ?? []).map(s => s.sfv2_profile_id as string).filter(Boolean);

  const [studyHallMap, testCenterMap, vocabMap] = await Promise.all([
    fetchStudyHallBatch(profileIds, start, end),
    fetchTestCenterBatch(profileIds, start, end),
    fetchVocabBatch(profileIds, start, end),
  ]);

  const results: StudentDayResult[] = (students ?? []).map(s => {
    const profileId = s.sfv2_profile_id as string | null;
    const displayName = (s.portal_name as string | null) || (s.name as string);
    const isActive = (s.lead_status as string) !== 'inactive';
    if (!profileId) {
      return { name: displayName, crmStudentId: s.id as string, sfv2ProfileId: null, isActive, studyHall: null, testCenter: [], vocab: null };
    }
    return {
      name: displayName,
      crmStudentId: s.id as string,
      sfv2ProfileId: profileId,
      isActive,
      studyHall: studyHallMap.get(profileId) ?? null,
      testCenter: testCenterMap.get(profileId) ?? [],
      vocab: vocabMap.get(profileId) ?? null,
    };
  });

  return { date, students: results };
}
