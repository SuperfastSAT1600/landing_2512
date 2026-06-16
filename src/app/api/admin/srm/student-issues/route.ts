import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { IssueChecklist } from '../issues/route';

export interface StudentIssue {
  id: string;
  student_id: string | null;
  sfv2_profile_id: string | null;
  student_name: string | null;
  issue_type: 'schedule_pending' | 'coach_pending' | 'renewal_needed' | 'custom';
  title: string;
  description: string | null;
  checklist: IssueChecklist[];
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at: string | null;
  created_by: string | null;
}

const DEFAULT_CHECKLISTS: Record<string, IssueChecklist[]> = {
  schedule_pending: [
    { id: 'available_time', label: '가능 시간 확인', done: false },
    { id: 'coach_match', label: '코치 매칭', done: false },
    { id: 'schedule_confirm', label: '일정 확정', done: false },
    { id: 'notify', label: '학생·학부모 안내', done: false },
  ],
  coach_pending: [
    { id: 'coach_candidate', label: '후보 코치 확인', done: false },
    { id: 'trial_schedule', label: '시범 수업 일정 안내', done: false },
    { id: 'assign_confirm', label: '배정 확정', done: false },
    { id: 'student_notify', label: '학생 안내', done: false },
  ],
  renewal_needed: [
    { id: 'check_burndown', label: '소진율 확인', done: false },
    { id: 'send_notice', label: '재결제 안내 발송', done: false },
    { id: 'payment_confirm', label: '결제 확인', done: false },
    { id: 'extend_schedule', label: '스케줄 연장', done: false },
  ],
  custom: [],
};

export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get('studentId');
  const sfv2ProfileId = req.nextUrl.searchParams.get('sfv2ProfileId');
  const status = req.nextUrl.searchParams.get('status');
  const resolvedSince = req.nextUrl.searchParams.get('resolvedSince');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10);

  let query = supabaseAdmin.from('srm_student_issues').select('*');

  if (studentId) {
    query = query.eq('student_id', studentId);
  } else if (sfv2ProfileId) {
    query = query.eq('sfv2_profile_id', sfv2ProfileId);
  }

  if (status) query = query.eq('status', status);
  if (resolvedSince) query = query.gte('resolved_at', resolvedSince);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []) as StudentIssue[]);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { studentId, sfv2ProfileId, studentName, issueType, title, description, checklist, createdBy } = body;

  if (!issueType || !title) {
    return NextResponse.json({ error: 'issueType, title required' }, { status: 400 });
  }
  if (!studentId && !sfv2ProfileId) {
    return NextResponse.json({ error: 'studentId or sfv2ProfileId required' }, { status: 400 });
  }

  const finalChecklist = checklist ?? DEFAULT_CHECKLISTS[issueType] ?? [];

  const { data, error } = await supabaseAdmin
    .from('srm_student_issues')
    .insert({
      student_id: studentId ?? null,
      sfv2_profile_id: sfv2ProfileId ?? null,
      student_name: studentName ?? null,
      issue_type: issueType,
      title,
      description: description ?? null,
      checklist: finalChecklist,
      created_by: createdBy ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as StudentIssue);
}
