import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { STAGE_LABELS, type SrmStage } from '@/app/admin/srm/lifecycle-constants';

export interface OpsTask {
  id: string;
  student_id: string | null;
  sfv2_profile_id: string | null;
  student_name: string | null;
  stage: SrmStage;
  stage_label: string;
  due_date: string;
  is_overdue: boolean;
  hasSummerProgram: boolean;
}

function getKstDateStr(date: Date): string {
  return date.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\. /g, '-').replace(/\.$/, '').replace(/\s/g, '');
}

// GET /api/admin/srm/ops-tasks?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get('date');
  const today = getKstDateStr(new Date());
  const targetDate = dateParam ?? today;

  // 해당 날짜 이하 due_date이면서 미완료인 모든 단계 (overdue 포함)
  const { data: stages, error } = await supabaseAdmin
    .from('srm_lifecycle_stages')
    .select('id, student_id, sfv2_profile_id, stage, due_date')
    .lte('due_date', targetDate)
    .is('completed_at', null)
    .order('due_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = stages ?? [];

  // CRM student_id → name, 여름방학 특강 여부 조회
  const studentIds = [...new Set(rows.map((r) => r.student_id).filter(Boolean))] as string[];
  const nameMap = new Map<string, string>();
  const summerStudentIds = new Set<string>();

  if (studentIds.length > 0) {
    const [{ data: students }, { data: summerRows }] = await Promise.all([
      supabaseAdmin.from('students').select('id, name').in('id', studentIds),
      supabaseAdmin.from('payments').select('student_id').ilike('product', '%여름방학%').in('student_id', studentIds),
    ]);

    for (const s of students ?? []) nameMap.set(s.id, s.name);
    for (const p of summerRows ?? []) summerStudentIds.add(p.student_id as string);
  }

  const tasks: OpsTask[] = rows.map((r) => ({
    id: r.id,
    student_id: r.student_id,
    sfv2_profile_id: r.sfv2_profile_id,
    student_name: r.student_id ? (nameMap.get(r.student_id) ?? null) : null,
    stage: r.stage as SrmStage,
    stage_label: STAGE_LABELS[r.stage as SrmStage] ?? r.stage,
    due_date: r.due_date,
    is_overdue: r.due_date < targetDate,
    hasSummerProgram: r.student_id ? summerStudentIds.has(r.student_id) : false,
  }));

  // overdue 먼저 정렬
  tasks.sort((a, b) => (a.is_overdue === b.is_overdue ? 0 : a.is_overdue ? -1 : 1));

  return NextResponse.json(tasks);
}
