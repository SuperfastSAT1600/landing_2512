import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CoachPrepView } from './CoachPrepView';
import type { CoachViewData } from '@/app/api/admin/srm/student/crm/[crmStudentId]/coach-view/route';
import type { WeeklySlot, ConsultationEntry } from '@/types/crm';

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function CoachPrepPage({ params }: Props) {
  const { studentId } = await params;

  type StudentRow = {
    id: string; name: string; grade: string; school_type: string | null;
    desired_subjects: string | null; previous_rw_score: number | null;
    previous_math_score: number | null; target_score: number | null;
    target_test_date: string | null; ot_datetime: string | null;
    weekly_schedule: unknown; parent_timezone: string | null;
    consultation_timeline: unknown;
  };

  const { data: raw, error } = await supabaseAdmin
    .from('students')
    .select(
      'id, name, grade, school_type, desired_subjects, ' +
      'previous_rw_score, previous_math_score, target_score, target_test_date, ' +
      'ot_datetime, weekly_schedule, parent_timezone, consultation_timeline'
    )
    .eq('id', studentId)
    .single();

  if (error || !raw) notFound();

  const student = raw as unknown as StudentRow;
  const timeline = (student.consultation_timeline ?? []) as ConsultationEntry[];
  const sorted = [...timeline].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const coachHistoryEntries = sorted
    .filter((e) => e.ai_coach_history?.trim() || e.raw_memo?.trim())
    .map((e) => ({
      id: e.id,
      created_at: e.created_at,
      content: e.ai_coach_history?.trim() ? e.ai_coach_history : e.raw_memo,
      author: e.author,
      is_raw: !e.ai_coach_history?.trim(),
    }));

  const { data: diagResult } = await supabaseAdmin
    .from('diagnostic_test_results')
    .select('submitted_at, previous_rw_score, previous_math_score')
    .ilike('student_name', `%${student.name}%`)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const data: CoachViewData = {
    id: student.id,
    name: student.name,
    grade: student.grade,
    school_type: student.school_type ?? null,
    desired_subjects: student.desired_subjects ?? null,
    previous_rw_score: student.previous_rw_score ?? null,
    previous_math_score: student.previous_math_score ?? null,
    target_score: student.target_score ?? null,
    target_test_date: student.target_test_date ?? null,
    ot_datetime: student.ot_datetime ?? null,
    weekly_schedule: (student.weekly_schedule ?? null) as WeeklySlot[] | null,
    parent_timezone: student.parent_timezone ?? null,
    coach_history_entries: coachHistoryEntries,
    diagnostic: diagResult ?? null,
  };

  return <CoachPrepView data={data} />;
}
