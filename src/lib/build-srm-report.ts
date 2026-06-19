import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import OpenAI from 'openai';
import type {
  LearningReport, DayReport, StudyHallDay, StudyHallSkill,
  TestCenterDay, TestCenterLesson, DailyReportDay, VocaDay,
} from '@/types/srm-portal';

const VOCAB_MASTER_BOX = 5;
const VOCAB_MAX_MISSED = 6;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function toKSTDate(isoStr: string): string {
  const d = new Date(isoStr);
  d.setHours(d.getHours() + 9);
  return d.toISOString().slice(0, 10);
}

function hashInput(data: unknown): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
}

async function prefetchNarrativeCache(profileId: string): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin
    .from('portal_narrative_cache')
    .select('report_date, item_type, input_hash, narrative')
    .eq('profile_id', profileId);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(`${row.report_date}:${row.item_type}:${row.input_hash}`, row.narrative as string);
  }
  return map;
}

function lookupCache(cache: Map<string, string>, date: string, itemType: string, inputHash: string): string | null {
  return cache.get(`${date}:${itemType}:${inputHash}`) ?? null;
}

async function setCachedNarrative(profileId: string, date: string, itemType: string, inputHash: string, narrative: string): Promise<void> {
  await supabaseAdmin
    .from('portal_narrative_cache')
    .upsert({ profile_id: profileId, report_date: date, item_type: itemType, input_hash: inputHash, narrative })
    .match({ profile_id: profileId, report_date: date, item_type: itemType, input_hash: inputHash });
}

async function generateStudyHallNarrative(stats: {
  durationMinutes: number; totalProblems: number; correctCount: number;
  accuracy: number; skills: StudyHallSkill[];
}): Promise<string> {
  const skillLines = stats.skills.sort((a, b) => b.total - a.total).slice(0, 4)
    .map(s => { const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0; return `${s.skill}: ${s.correct}/${s.total}문항 (${acc}%)`; })
    .join(' | ');
  const weakestSkill = stats.skills.length > 0
    ? [...stats.skills].sort((a, b) => (a.total > 0 ? a.correct / a.total : 1) - (b.total > 0 ? b.correct / b.total : 1))[0]
    : null;
  const volumeCtx = stats.totalProblems < 15 ? '짧은 연습 세션' : stats.totalProblems < 40 ? '보통 세션' : '집중 세션';
  const perfCtx = stats.accuracy >= 85 ? '우수한 성취' : stats.accuracy >= 70 ? '안정적인 수준' : stats.accuracy >= 50 ? '보완이 필요한 구간' : '집중 분석이 필요한 상태';
  const userContent = [
    `학습 시간: ${stats.durationMinutes}분 / ${volumeCtx} / 총 ${stats.totalProblems}문항 / 정답 ${stats.correctCount}개 / 정답률 ${stats.accuracy}% [${perfCtx}]`,
    skillLines ? `스킬별 성취: ${skillLines}` : '',
    weakestSkill && stats.skills.length > 1 ? `가장 취약한 스킬: ${weakestSkill.skill} (${weakestSkill.correct}/${weakestSkill.total}문항)` : '',
  ].filter(Boolean).join('\n');
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `SAT 학원 코치. 스터디홀 학습 데이터를 분석해 학부모에게 보내는 오늘의 리포트를 3문장으로 작성한다.\n작성 원칙:\n- 숫자를 나열하는 게 아니라 그 숫자가 의미하는 학습 상태를 해석할 것\n- 정답률 톤: ≥85% → 강점·성취 강조 / 70~84% → 잘한 점과 보완점 균형 / 50~69% → 개선 방향 구체적 제시 / <50% → 어떤 유형이 흔들리는지 명확히 지목\n- 취약 스킬이 있으면 반드시 그 스킬 이름을 문장에 포함\n- 문제 볼륨(짧은 연습 vs 집중 세션)이 드러나도록 서술\n- 매번 다른 문장 구조로 시작할 것\n- 마지막 문장은 다음 수업에서의 구체적 보완 액션` },
      { role: 'user', content: userContent },
    ],
    max_tokens: 320, temperature: 0.3,
  });
  return res.choices[0]?.message?.content?.trim() ?? '';
}

async function generateTestCenterNarrative(stats: {
  curriculumTitle?: string; curriculumDomain?: string;
  totalScore: number; totalProblems: number; lessons: TestCenterLesson[];
}): Promise<string> {
  const accuracy = stats.totalProblems > 0 ? Math.round((stats.totalScore / stats.totalProblems) * 100) : 0;
  const perfCtx = accuracy >= 85 ? '우수' : accuracy >= 70 ? '양호' : '보완 필요';
  const lessonLines = stats.lessons.map((l, i) => { const pct = l.total > 0 ? Math.round((l.score / l.total) * 100) : 0; return `${l.title ?? `Module ${i + 1}`}: ${l.score}/${l.total} (${pct}%)`; }).join(' | ');
  let trendNote = '';
  if (stats.lessons.length >= 2) {
    const accs = stats.lessons.map(l => (l.total > 0 ? l.score / l.total : 0));
    const first = accs[0]; const last = accs[accs.length - 1];
    if (last - first > 0.08) trendNote = '후반 모듈로 갈수록 성취가 올라가는 상승 흐름';
    else if (first - last > 0.08) trendNote = '후반 모듈에서 정확도가 떨어지는 흐름';
    else trendNote = '모듈 간 일관된 성취';
  }
  const userContent = [
    stats.curriculumTitle ? `테스트: ${stats.curriculumTitle}${stats.curriculumDomain ? ` (${stats.curriculumDomain === 'reading_and_writing' ? 'RW' : stats.curriculumDomain === 'math' ? 'Math' : stats.curriculumDomain})` : ''}` : '',
    `총점: ${stats.totalScore}/${stats.totalProblems} (${accuracy}%) [${perfCtx}]`,
    lessonLines ? `모듈별: ${lessonLines}` : '',
    trendNote ? `흐름: ${trendNote}` : '',
  ].filter(Boolean).join('\n');
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `SAT 학원 코치. 테스트 센터 결과를 분석해 학부모에게 3문장으로 전달한다.\n작성 원칙:\n- 전체 정확도만 보지 말고 모듈 간 흐름(상승·유지·하락)을 해석\n- 약한 모듈이 있으면 그 모듈을 구체적으로 지목\n- 커리큘럼 제목이 있으면 반드시 언급\n- 마지막 문장은 다음 수업에서 어떤 파트를 리뷰할지로 마무리` },
      { role: 'user', content: userContent },
    ],
    max_tokens: 350, temperature: 0.3,
  });
  return res.choices[0]?.message?.content?.trim() ?? '';
}

async function generateVocaNarrative(stats: {
  wordCount: number; gradedCount: number; correctCount: number;
  accuracy: number; masteredCount: number; missedTerms: string[];
}): Promise<string> {
  const perfCtx = stats.accuracy >= 80 ? '잘 익어가는 단계' : stats.accuracy >= 60 ? '꾸준히 쌓이는 중' : stats.accuracy >= 40 ? '아직 낯선 단어가 많은 초기 단계' : '집중 반복 노출이 필요한 단계';
  const missedLine = stats.missedTerms.length ? `복습 필요 단어(${stats.missedTerms.length}개): ${stats.missedTerms.join(', ')}` : '복습 필요 단어 없음';
  const userContent = [
    `단어 볼륨: ${stats.wordCount}개 학습 / 채점 ${stats.gradedCount}문항 / 정답 ${stats.correctCount}개 / 정답률 ${stats.accuracy}% [${perfCtx}]`,
    `마스터 단어: ${stats.masteredCount}개`, missedLine,
  ].join('\n');
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `SAT 학원 코치. 하루 어휘 학습 결과를 분석해 학부모에게 3문장으로 전달한다.\n작성 원칙:\n- 단어 수(볼륨)와 정답률을 함께 해석\n- 마스터 단어가 있으면 반드시 언급\n- 마지막 문장은 다음 복습 방향으로 마무리` },
      { role: 'user', content: userContent },
    ],
    max_tokens: 300, temperature: 0.3,
  });
  return res.choices[0]?.message?.content?.trim() ?? '';
}

export async function buildSrmReport(profileId: string): Promise<LearningReport> {
  const [
    narrativeCache,
    { data: shSessions },
    { data: shAttempts },
    { data: tcAttempts },
    { data: dailyReports },
    { data: vocabEvents },
    { data: vocabExposed },
  ] = await Promise.all([
    prefetchNarrativeCache(profileId),
    supabaseSFv2.from('study_hall_session').select('id, started_at, ended_at').eq('user_id', profileId).not('ended_at', 'is', null).order('started_at', { ascending: false }).limit(60),
    supabaseSFv2.from('study_hall_unit_attempts').select('study_hall_session_id, is_correct, attempted_at, unit_id').eq('student_id', profileId).order('attempted_at', { ascending: false }).limit(500),
    supabaseSFv2.from('test_center_lesson_attempts').select('test_center_session_id, score, total, status, lesson_id, curriculum_id').eq('student_id', profileId).not('score', 'is', null),
    supabaseSFv2.from('daily_reports').select('report_date, report_md, status').eq('student_id', profileId).eq('status', 'sent').order('report_date', { ascending: false }).limit(30),
    supabaseSFv2.schema('vocab').from('events').select('entry_id, is_correct, prev_box, new_box, occurred_at').eq('subject_id', profileId).eq('kind', 'graded').order('occurred_at', { ascending: false }).limit(1000),
    supabaseSFv2.schema('vocab').from('events').select('entry_id').eq('subject_id', profileId).limit(10000),
  ]);

  const vocabExposedCount = new Set((vocabExposed ?? []).map(r => r.entry_id as string).filter(Boolean)).size;

  const unitIds = [...new Set((shAttempts ?? []).map(a => a.unit_id as string).filter(Boolean))];
  const { data: unitsMeta } = unitIds.length ? await supabaseSFv2.from('units').select('id, skill, domain').in('id', unitIds) : { data: [] };
  const unitsMap = new Map<string, { skill: string; domain: string }>();
  for (const u of unitsMeta ?? []) { if (u.id && u.skill) unitsMap.set(u.id, { skill: u.skill as string, domain: u.domain as string }); }

  const tcSessionIds = [...new Set((tcAttempts ?? []).map(a => a.test_center_session_id as string).filter(Boolean))];
  const tcLessonIds = [...new Set((tcAttempts ?? []).map(a => a.lesson_id as string).filter(Boolean))];
  const tcCurriculumIds = [...new Set((tcAttempts ?? []).map(a => a.curriculum_id as string).filter(Boolean))];

  const [{ data: tcSessions }, { data: tcLessons }, { data: tcCurricula }] = await Promise.all([
    tcSessionIds.length ? supabaseSFv2.from('test_center_session').select('id, started_at').in('id', tcSessionIds) : { data: [] },
    tcLessonIds.length ? supabaseSFv2.from('lessons').select('id, title').in('id', tcLessonIds) : { data: [] },
    tcCurriculumIds.length ? supabaseSFv2.from('curricula').select('id, title, domain').in('id', tcCurriculumIds) : { data: [] },
  ]);

  const lessonTitleMap = new Map<string, string>();
  for (const l of tcLessons ?? []) { if (l.id && l.title) lessonTitleMap.set(l.id as string, l.title as string); }
  const curriculumMap = new Map<string, { title: string; domain: string }>();
  for (const c of tcCurricula ?? []) { if (c.id && c.title) curriculumMap.set(c.id, { title: c.title as string, domain: (c.domain as string) ?? '' }); }

  const dayMap = new Map<string, DayReport>();
  function getOrCreate(date: string): DayReport {
    if (!dayMap.has(date)) dayMap.set(date, { date, items: [] });
    return dayMap.get(date)!;
  }

  // Study Hall
  const shSessionMap = new Map<string, { started_at: string; ended_at: string }>();
  for (const s of shSessions ?? []) shSessionMap.set(s.id, { started_at: s.started_at, ended_at: s.ended_at });

  const shBySession = new Map<string, { total: number; correct: number }>();
  for (const a of shAttempts ?? []) {
    const sid = a.study_hall_session_id as string;
    if (!shBySession.has(sid)) shBySession.set(sid, { total: 0, correct: 0 });
    const e = shBySession.get(sid)!; e.total++;
    if (a.is_correct) e.correct++;
  }

  const shSkillsBySession = new Map<string, Map<string, { skill: string; domain: string; correct: number; total: number }>>();
  for (const a of shAttempts ?? []) {
    const sid = a.study_hall_session_id as string;
    const uid = a.unit_id as string;
    if (!uid) continue;
    const meta = unitsMap.get(uid);
    if (!meta?.skill) continue;
    if (!shSkillsBySession.has(sid)) shSkillsBySession.set(sid, new Map());
    const skillMap = shSkillsBySession.get(sid)!;
    if (!skillMap.has(meta.skill)) skillMap.set(meta.skill, { skill: meta.skill, domain: meta.domain, correct: 0, total: 0 });
    const sk = skillMap.get(meta.skill)!; sk.total++;
    if (a.is_correct) sk.correct++;
  }

  const shByDate = new Map<string, { totalMinutes: number; totalProblems: number; correctCount: number; skillMap: Map<string, { skill: string; domain: string; correct: number; total: number }> }>();
  for (const [sid, stats] of shBySession) {
    const s = shSessionMap.get(sid);
    if (!s) continue;
    const date = toKSTDate(s.started_at);
    const minutes = Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
    if (!shByDate.has(date)) shByDate.set(date, { totalMinutes: 0, totalProblems: 0, correctCount: 0, skillMap: new Map() });
    const d = shByDate.get(date)!;
    d.totalMinutes += minutes; d.totalProblems += stats.total; d.correctCount += stats.correct;
    const sessionSkills = shSkillsBySession.get(sid);
    if (sessionSkills) {
      for (const [skillKey, sk] of sessionSkills) {
        if (!d.skillMap.has(skillKey)) d.skillMap.set(skillKey, { skill: sk.skill, domain: sk.domain, correct: 0, total: 0 });
        const ds = d.skillMap.get(skillKey)!; ds.correct += sk.correct; ds.total += sk.total;
      }
    }
  }

  await Promise.all(Array.from(shByDate.entries()).map(async ([date, stats]) => {
    const accuracy = stats.totalProblems > 0 ? Math.round((stats.correctCount / stats.totalProblems) * 100) : 0;
    const skills = Array.from(stats.skillMap.values());
    const cacheInput = { durationMinutes: stats.totalMinutes, totalProblems: stats.totalProblems, correctCount: stats.correctCount, accuracy, skills: [...skills].sort((a, b) => a.skill.localeCompare(b.skill)).map(s => ({ skill: s.skill, correct: s.correct, total: s.total })) };
    const inputHash = hashInput(cacheInput);
    let narrative = lookupCache(narrativeCache, date, 'study_hall', inputHash);
    if (!narrative) {
      narrative = stats.totalProblems > 0 ? await generateStudyHallNarrative({ durationMinutes: stats.totalMinutes, totalProblems: stats.totalProblems, correctCount: stats.correctCount, accuracy, skills }) : `${stats.totalMinutes}분간 스터디홀에 접속했습니다.`;
      await setCachedNarrative(profileId, date, 'study_hall', inputHash, narrative);
    }
    getOrCreate(date).items.push({ type: 'study_hall', durationMinutes: stats.totalMinutes, totalProblems: stats.totalProblems, correctCount: stats.correctCount, accuracy, aiNarrative: narrative, skills: skills.length > 0 ? skills : undefined } satisfies StudyHallDay);
  }));

  // Test Center
  const tcSessionDateMap = new Map<string, string>();
  for (const s of tcSessions ?? []) tcSessionDateMap.set(s.id, toKSTDate(s.started_at));

  const tcBySession = new Map<string, { lessons: TestCenterLesson[]; curriculumTitle?: string; curriculumDomain?: string }>();
  for (const a of tcAttempts ?? []) {
    const sid = a.test_center_session_id as string;
    if (!tcSessionDateMap.has(sid)) continue;
    if (!tcBySession.has(sid)) {
      const currId = a.curriculum_id as string | undefined;
      const curriculum = currId ? curriculumMap.get(currId) : undefined;
      tcBySession.set(sid, { lessons: [], curriculumTitle: curriculum?.title, curriculumDomain: curriculum?.domain });
    }
    const lessonId = a.lesson_id as string | undefined;
    tcBySession.get(sid)!.lessons.push({ title: lessonId ? lessonTitleMap.get(lessonId) : undefined, score: a.score as number, total: a.total as number });
  }

  await Promise.all(Array.from(tcBySession.entries()).map(async ([sid, data]) => {
    const date = tcSessionDateMap.get(sid)!;
    const totalScore = data.lessons.reduce((s, x) => s + x.score, 0);
    const totalProblems = data.lessons.reduce((s, x) => s + x.total, 0);
    const cacheInput = { curriculumTitle: data.curriculumTitle, curriculumDomain: data.curriculumDomain, totalScore, totalProblems, lessons: data.lessons.map(l => ({ title: l.title, score: l.score, total: l.total })) };
    const inputHash = hashInput(cacheInput);
    let narrative: string | undefined;
    if (totalProblems > 0) {
      narrative = lookupCache(narrativeCache, date, 'test_center', inputHash) ?? undefined;
      if (!narrative) {
        narrative = await generateTestCenterNarrative({ curriculumTitle: data.curriculumTitle, curriculumDomain: data.curriculumDomain, totalScore, totalProblems, lessons: data.lessons });
        await setCachedNarrative(profileId, date, 'test_center', inputHash, narrative);
      }
    }
    getOrCreate(date).items.push({ type: 'test_center', curriculumTitle: data.curriculumTitle, curriculumDomain: data.curriculumDomain, lessons: data.lessons, totalScore, totalProblems, aiNarrative: narrative } satisfies TestCenterDay);
  }));

  // Daily Reports
  for (const dr of dailyReports ?? []) {
    getOrCreate(dr.report_date as string).items.push({ type: 'daily_report', reportMd: dr.report_md as string } satisfies DailyReportDay);
  }

  // Vocab
  type VocaAgg = { entryIds: Set<string>; gradedCount: number; correctCount: number; masteredIds: Set<string>; missedIds: string[] };
  const vocaByDate = new Map<string, VocaAgg>();
  for (const e of vocabEvents ?? []) {
    const entryId = e.entry_id as string | null;
    if (!entryId) continue;
    const date = toKSTDate(e.occurred_at as string);
    if (!vocaByDate.has(date)) vocaByDate.set(date, { entryIds: new Set(), gradedCount: 0, correctCount: 0, masteredIds: new Set(), missedIds: [] });
    const agg = vocaByDate.get(date)!;
    agg.entryIds.add(entryId); agg.gradedCount++;
    if (e.is_correct === true) agg.correctCount++;
    if (e.is_correct === false) agg.missedIds.push(entryId);
    const prevBox = (e.prev_box as number | null) ?? 0;
    const newBox = (e.new_box as number | null) ?? 0;
    if (newBox >= VOCAB_MASTER_BOX && prevBox < VOCAB_MASTER_BOX) agg.masteredIds.add(entryId);
  }

  const missedEntryIds = [...new Set(Array.from(vocaByDate.values()).flatMap(a => a.missedIds))];
  const { data: vocabEntries } = missedEntryIds.length ? await supabaseSFv2.schema('vocab').from('entries').select('id, term').in('id', missedEntryIds) : { data: [] };
  const termMap = new Map<string, string>();
  for (const en of vocabEntries ?? []) { if (en.id && en.term) termMap.set(en.id as string, en.term as string); }

  await Promise.all(Array.from(vocaByDate.entries()).map(async ([date, agg]) => {
    const wordCount = agg.entryIds.size;
    const accuracy = agg.gradedCount > 0 ? Math.round((agg.correctCount / agg.gradedCount) * 100) : 0;
    const masteredCount = agg.masteredIds.size;
    const missedTerms = [...new Set(agg.missedIds)].map(id => termMap.get(id)).filter((t): t is string => Boolean(t)).slice(0, VOCAB_MAX_MISSED);
    const cacheInput = { wordCount, gradedCount: agg.gradedCount, correctCount: agg.correctCount, accuracy, masteredCount, missedTerms: [...missedTerms].sort() };
    const inputHash = hashInput(cacheInput);
    let narrative = lookupCache(narrativeCache, date, 'voca', inputHash);
    if (!narrative) {
      narrative = await generateVocaNarrative({ wordCount, gradedCount: agg.gradedCount, correctCount: agg.correctCount, accuracy, masteredCount, missedTerms });
      await setCachedNarrative(profileId, date, 'voca', inputHash, narrative);
    }
    getOrCreate(date).items.push({ type: 'voca', wordCount, gradedCount: agg.gradedCount, correctCount: agg.correctCount, accuracy, masteredCount, missedTerms, aiNarrative: narrative } satisfies VocaDay);
  }));

  const days = Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  return { days, vocabExposedCount };
}
