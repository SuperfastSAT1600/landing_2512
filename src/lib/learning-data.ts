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

export async function fetchStudyHall(profileId: string, start: string, end: string): Promise<StudyHallResult | null> {
  const { data: sessions } = await supabaseSFv2
    .from('study_hall_session')
    .select('id, started_at, ended_at')
    .eq('user_id', profileId)
    .gte('started_at', start)
    .lte('started_at', end)
    .not('ended_at', 'is', null);

  if (!sessions?.length) return null;

  const sessionIds = sessions.map((s: { id: string }) => s.id);
  const { data: attempts } = await supabaseSFv2
    .from('study_hall_unit_attempts')
    .select('study_hall_session_id, is_correct, unit_id')
    .eq('student_id', profileId)
    .in('study_hall_session_id', sessionIds);

  const unitIds = [...new Set((attempts ?? []).map((a: { unit_id: string }) => a.unit_id).filter(Boolean))];
  const { data: unitsMeta } = unitIds.length
    ? await supabaseSFv2.from('units').select('id, skill, domain').in('id', unitIds)
    : { data: [] };

  const unitsMap = new Map<string, { skill: string; domain: string }>();
  for (const u of unitsMeta ?? []) {
    if (u.id && u.skill) unitsMap.set(u.id as string, { skill: u.skill as string, domain: (u.domain as string) ?? '' });
  }

  const sessionTimeMap = new Map<string, { started_at: string; ended_at: string }>();
  for (const s of sessions) sessionTimeMap.set(s.id, { started_at: s.started_at, ended_at: s.ended_at });

  let totalMinutes = 0;
  let totalProblems = 0;
  let correctCount = 0;
  const skillMap = new Map<string, { skill: string; domain: string; correct: number; total: number }>();

  for (const sid of sessionIds) {
    const s = sessionTimeMap.get(sid);
    if (s?.ended_at) {
      totalMinutes += Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
    }
  }

  for (const a of attempts ?? []) {
    totalProblems++;
    if (a.is_correct) correctCount++;
    const meta = a.unit_id ? unitsMap.get(a.unit_id as string) : undefined;
    if (meta?.skill) {
      if (!skillMap.has(meta.skill)) skillMap.set(meta.skill, { skill: meta.skill, domain: meta.domain, correct: 0, total: 0 });
      const sk = skillMap.get(meta.skill)!;
      sk.total++;
      if (a.is_correct) sk.correct++;
    }
  }

  return {
    durationMinutes: totalMinutes,
    totalProblems,
    correctCount,
    accuracy: totalProblems > 0 ? Math.round((correctCount / totalProblems) * 100) : 0,
    skills: Array.from(skillMap.values()),
  };
}

export async function fetchTestCenter(profileId: string, start: string, end: string): Promise<TestCenterResult[]> {
  const { data: sessions } = await supabaseSFv2
    .from('test_center_session')
    .select('id, started_at')
    .eq('user_id', profileId)
    .gte('started_at', start)
    .lte('started_at', end);

  if (!sessions?.length) return [];

  const sessionIds = sessions.map((s: { id: string }) => s.id);
  const { data: attempts } = await supabaseSFv2
    .from('test_center_lesson_attempts')
    .select('test_center_session_id, score, total, lesson_id, curriculum_id')
    .eq('student_id', profileId)
    .in('test_center_session_id', sessionIds)
    .not('score', 'is', null);

  if (!attempts?.length) return [];

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

  const bySession = new Map<string, TestCenterResult>();
  for (const a of attempts) {
    const sid = a.test_center_session_id as string;
    if (!bySession.has(sid)) {
      const currId = a.curriculum_id as string | undefined;
      const curriculum = currId ? curriculumMap.get(currId) : undefined;
      bySession.set(sid, {
        curriculumTitle: curriculum?.title,
        curriculumDomain: curriculum?.domain,
        totalScore: 0,
        totalProblems: 0,
        lessons: [],
      });
    }
    const result = bySession.get(sid)!;
    const lessonId = a.lesson_id as string | undefined;
    const score = a.score as number;
    const total = a.total as number;
    result.lessons.push({ title: lessonId ? lessonTitleMap.get(lessonId) : undefined, score, total });
    result.totalScore += score;
    result.totalProblems += total;
  }

  return Array.from(bySession.values());
}

export async function fetchVocab(profileId: string, start: string, end: string): Promise<VocabResult | null> {
  const VOCAB_MASTER_BOX = 5;
  const VOCAB_MAX_MISSED = 6;

  const { data: events } = await supabaseSFv2
    .schema('vocab')
    .from('events')
    .select('entry_id, is_correct, prev_box, new_box, occurred_at')
    .eq('subject_id', profileId)
    .eq('kind', 'graded')
    .gte('occurred_at', start)
    .lte('occurred_at', end);

  if (!events?.length) return null;

  const entryIds = new Set<string>();
  let gradedCount = 0;
  let correctCount = 0;
  const masteredIds = new Set<string>();
  const missedIds: string[] = [];

  for (const e of events) {
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
  const { data: vocabEntries } = uniqueMissedIds.length
    ? await supabaseSFv2.schema('vocab').from('entries').select('id, term').in('id', uniqueMissedIds)
    : { data: [] };

  const termMap = new Map<string, string>();
  for (const en of vocabEntries ?? []) if (en.id && en.term) termMap.set(en.id as string, en.term as string);

  return {
    wordCount: entryIds.size,
    gradedCount,
    correctCount,
    accuracy: gradedCount > 0 ? Math.round((correctCount / gradedCount) * 100) : 0,
    masteredCount: masteredIds.size,
    missedTerms: uniqueMissedIds.map(id => termMap.get(id)).filter((t): t is string => Boolean(t)),
  };
}

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

  const results: StudentDayResult[] = await Promise.all(
    (students ?? []).map(async (s) => {
      const profileId = s.sfv2_profile_id as string | null;
      const displayName = (s.portal_name as string | null) || (s.name as string);
      if (!profileId) {
        return { name: displayName, crmStudentId: s.id as string, sfv2ProfileId: null, studyHall: null, testCenter: [], vocab: null };
      }
      const [studyHall, testCenter, vocab] = await Promise.all([
        fetchStudyHall(profileId, start, end),
        fetchTestCenter(profileId, start, end),
        fetchVocab(profileId, start, end),
      ]);
      return { name: displayName, crmStudentId: s.id as string, sfv2ProfileId: profileId, studyHall, testCenter, vocab };
    })
  );

  // results are indexed by internal name for ordering, display name is already resolved
  const internalNames = (students ?? []).map(s => s.name as string);
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

  const results: StudentDayResult[] = await Promise.all(
    (students ?? []).map(async (s) => {
      const profileId = s.sfv2_profile_id as string | null;
      const displayName = (s.portal_name as string | null) || (s.name as string);
      const isActive = (s.lead_status as string) !== 'inactive';
      if (!profileId) {
        return { name: displayName, crmStudentId: s.id as string, sfv2ProfileId: null, isActive, studyHall: null, testCenter: [], vocab: null };
      }
      const [studyHall, testCenter, vocab] = await Promise.all([
        fetchStudyHall(profileId, start, end),
        fetchTestCenter(profileId, start, end),
        fetchVocab(profileId, start, end),
      ]);
      return { name: displayName, crmStudentId: s.id as string, sfv2ProfileId: profileId, isActive, studyHall, testCenter, vocab };
    })
  );

  return { date, students: results };
}
