import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { IssueChecklist } from '../issues/route';
import { isAuthenticated } from '@/lib/server-auth';

export interface CoachIssue {
  id: string;
  coach_id: string | null;
  coach_name: string | null;
  issue_type: 'schedule' | 'payment_no_response' | 'request_no_response' | 'custom';
  title: string;
  description: string | null;
  checklist: IssueChecklist[];
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at: string | null;
  created_by: string | null;
  resolution_note: string | null;
}

const DEFAULT_CHECKLISTS: Record<string, IssueChecklist[]> = {
  schedule: [
    { id: 'change_request_confirm', label: '변경 요청 확인', done: false },
    { id: 'student_notify', label: '학생 안내', done: false },
    { id: 'schedule_done', label: '스케줄 조율 완료', done: false },
  ],
  payment_no_response: [
    { id: 'retry_contact', label: '연락 재시도', done: false },
    { id: 'payment_confirm', label: '지급 확인', done: false },
    { id: 'result_record', label: '처리 결과 기록', done: false },
  ],
  request_no_response: [
    { id: 'resend_request', label: '요청 재전달', done: false },
    { id: 'response_confirm', label: '반응 확인', done: false },
    { id: 'fulfill_check', label: '이행 여부 확인', done: false },
  ],
  custom: [],
};

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const coachId = req.nextUrl.searchParams.get('coachId');
  const status = req.nextUrl.searchParams.get('status');
  const resolvedSince = req.nextUrl.searchParams.get('resolvedSince');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10);

  let query = supabaseAdmin.from('srm_coach_issues').select('*');

  if (coachId) query = query.eq('coach_id', coachId);
  if (status) query = query.eq('status', status);
  if (resolvedSince) query = query.gte('resolved_at', resolvedSince);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []) as CoachIssue[]);
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { coachId, coachName, issueType, title, description, checklist, createdBy } = body;

  if (!issueType || !title) {
    return NextResponse.json({ error: 'issueType, title required' }, { status: 400 });
  }
  if (!coachId) {
    return NextResponse.json({ error: 'coachId required' }, { status: 400 });
  }

  const finalChecklist = checklist ?? DEFAULT_CHECKLISTS[issueType] ?? [];

  const { data, error } = await supabaseAdmin
    .from('srm_coach_issues')
    .insert({
      coach_id: coachId,
      coach_name: coachName ?? null,
      issue_type: issueType,
      title,
      description: description ?? null,
      checklist: finalChecklist,
      created_by: createdBy ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as CoachIssue);
}
