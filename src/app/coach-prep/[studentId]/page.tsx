import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CoachPrepView } from './CoachPrepView';
import type { WeeklySlot, ConsultationEntry } from '@/types/crm';
import type { DayItem } from '@/types/srm-portal';

interface Props {
  params: Promise<{ studentId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studentId } = await params;
  const { data } = await supabaseAdmin
    .from('students')
    .select('name')
    .eq('id', studentId)
    .maybeSingle();
  const name = (data as { name?: string } | null)?.name ?? '학생';
  return {
    title: `${name} 코치 준비 자료 · SuperfastSAT`,
    openGraph: { title: `${name} 코치 준비 자료` },
  };
}

type StudentRow = {
  id: string; name: string; grade: string; school_type: string | null;
  desired_subjects: string | null; preferred_language: string | null;
  previous_rw_score: number | null;
  previous_math_score: number | null; target_score: number | null;
  target_test_date: string | null; target_score_2: number | null;
  target_test_date_2: string | null; ot_datetime: string | null;
  weekly_schedule: unknown; parent_timezone: string | null;
  consultation_timeline: unknown; sfv2_profile_id: string | null;
  diagnostic_result_id: string | null;
};

type ExamScoreRow = {
  exam_month: string;
  rw_score: number | null;
  math_score: number | null;
  note: string | null;
};

interface SrmBriefData {
  headline: string;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  recommendation: string;
}

export interface SrmSkill {
  skill: string;
  sh_accuracy: number | null;
  sh_total: number;
  tc_accuracy: number | null;
  tc_total: number;
}

function computeSkills(days: { items: DayItem[] }[]): SrmSkill[] {
  const sh = new Map<string, { c: number; t: number }>();
  const tc = new Map<string, { c: number; t: number }>();

  for (const day of days) {
    for (const item of day.items) {
      if (item.type === 'study_hall' && item.skills) {
        for (const sk of item.skills) {
          const e = sh.get(sk.skill) ?? { c: 0, t: 0 };
          e.c += sk.correct; e.t += sk.total;
          sh.set(sk.skill, e);
        }
      }
      if (item.type === 'test_center' && item.skills) {
        for (const sk of item.skills) {
          const e = tc.get(sk.skill) ?? { c: 0, t: 0 };
          e.c += (sk as { correct: number; total: number }).correct;
          e.t += (sk as { correct: number; total: number }).total;
          tc.set(sk.skill, e);
        }
      }
    }
  }

  const allSkills = new Set([...sh.keys(), ...tc.keys()]);
  const result: SrmSkill[] = [];
  for (const skill of allSkills) {
    const s = sh.get(skill);
    const t = tc.get(skill);
    const shTotal = s?.t ?? 0;
    const tcTotal = t?.t ?? 0;
    if (shTotal < 3 && tcTotal < 3) continue;
    result.push({
      skill,
      sh_accuracy: s && s.t >= 3 ? Math.round((s.c / s.t) * 100) : null,
      sh_total: shTotal,
      tc_accuracy: t && t.t >= 3 ? Math.round((t.c / t.t) * 100) : null,
      tc_total: tcTotal,
    });
  }
  return result.sort((a, b) => {
    const aAcc = a.sh_accuracy ?? a.tc_accuracy ?? 100;
    const bAcc = b.sh_accuracy ?? b.tc_accuracy ?? 100;
    return aAcc - bAcc;
  });
}

export default async function CoachPrepPage({ params }: Props) {
  const { studentId } = await params;

  // 1단계: 학생 + 시험 점수 병렬 조회
  const [{ data: raw, error }, { data: examScoresRaw }] = await Promise.all([
    supabaseAdmin
      .from('students')
      .select(
        'id, name, grade, school_type, desired_subjects, preferred_language, ' +
        'previous_rw_score, previous_math_score, target_score, target_test_date, target_score_2, target_test_date_2, ' +
        'ot_datetime, weekly_schedule, parent_timezone, consultation_timeline, sfv2_profile_id, diagnostic_result_id'
      )
      .eq('id', studentId)
      .single(),
    supabaseAdmin
      .from('student_exam_scores')
      .select('exam_month, rw_score, math_score, note')
      .eq('student_id', studentId)
      .order('exam_month', { ascending: true }),
  ]);

  if (error || !raw) notFound();

  const student = raw as unknown as StudentRow;
  const timeline = (student.consultation_timeline ?? []) as ConsultationEntry[];
  const sorted = [...timeline].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const coachHistoryEntries = sorted
    .filter((e) =>
      e.coach_visible === true ||
      (e.coach_visible === undefined && e.ai_coach_history?.trim())
    )
    .map((e) => ({
      id: e.id,
      created_at: e.created_at,
      content: e.ai_coach_history?.trim() ? e.ai_coach_history : e.raw_memo,
      author: e.author,
      is_raw: !e.ai_coach_history?.trim(),
    }));

  // 2단계: 학생 ID 확보 후 병렬 조회 (진단, SRM 브리핑 캐시, 스킬)
  const briefQuery = student.sfv2_profile_id
    ? supabaseAdmin
        .from('portal_narrative_cache')
        .select('narrative')
        .eq('profile_id', student.sfv2_profile_id)
        .eq('item_type', 'situation_brief')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const skillsPromise: Promise<SrmSkill[] | null> = student.sfv2_profile_id
    ? (async () => {
        try {
          const { buildSrmReport } = await import('@/lib/build-srm-report');
          const report = await buildSrmReport(student.sfv2_profile_id!, { skipNarratives: true });
          return computeSkills(report.days);
        } catch {
          return null;
        }
      })()
    : Promise.resolve(null);

  const [{ data: diagResult }, { data: briefCache }, srmSkills] = await Promise.all([
    supabaseAdmin
      .from('diagnostic_test_results')
      .select('submitted_at, previous_rw_score, previous_math_score, total_time_seconds, edited_insights')
      .ilike('student_name', `%${student.name}%`)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    briefQuery,
    skillsPromise,
  ]);

  // 캐시에서 SRM 브리핑 파싱 (서버 사이드 — auth 불필요)
  let srmBrief: SrmBriefData | null = null;
  if (briefCache && 'narrative' in briefCache && briefCache.narrative) {
    try { srmBrief = JSON.parse(briefCache.narrative as string) as SrmBriefData; } catch {}
  }

  type DiagRow = {
    submitted_at: string;
    previous_rw_score: number | null;
    previous_math_score: number | null;
    total_time_seconds: number | null;
    edited_insights: unknown;
  };

  const diag = diagResult as DiagRow | null;

  const data = {
    id: student.id,
    name: student.name,
    grade: student.grade,
    school_type: student.school_type ?? null,
    desired_subjects: student.desired_subjects ?? null,
    preferred_language: student.preferred_language ?? null,
    previous_rw_score: student.previous_rw_score ?? null,
    previous_math_score: student.previous_math_score ?? null,
    target_score: student.target_score ?? null,
    target_test_date: student.target_test_date ?? null,
    target_score_2: student.target_score_2 ?? null,
    target_test_date_2: student.target_test_date_2 ?? null,
    ot_datetime: student.ot_datetime ?? null,
    weekly_schedule: (student.weekly_schedule ?? null) as WeeklySlot[] | null,
    parent_timezone: student.parent_timezone ?? null,
    coach_history_entries: coachHistoryEntries,
    diagnostic: diag ? {
      submitted_at: diag.submitted_at,
      previous_rw_score: diag.previous_rw_score,
      previous_math_score: diag.previous_math_score,
      total_time_seconds: diag.total_time_seconds,
      edited_insights: diag.edited_insights as {
        executiveSummary?: string;
        topWeakDomains?: Array<{ domain: string; delta: number; note: string }>;
        keyRecommendations?: string[];
      } | null,
    } : null,
    exam_scores: (examScoresRaw ?? []) as ExamScoreRow[],
    srm_skills: srmSkills,
    srm_brief: srmBrief,
    sfv2_profile_id: student.sfv2_profile_id ?? null,
    diagnostic_result_id: student.diagnostic_result_id ?? null,
  };

  return <CoachPrepView data={data} />;
}
