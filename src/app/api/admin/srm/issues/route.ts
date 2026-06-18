import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export interface IssueChecklist {
  id: string;
  label: string;
  done: boolean;
}

export interface EventIssue {
  id: string;
  event_id: string;
  issue_type: 'cancellation' | 'coach_change' | 'no_show' | 'custom';
  title: string;
  description: string | null;
  checklist: IssueChecklist[];
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at: string | null;
  created_by: string | null;
  student_name: string | null;
  coach_name: string | null;
}

const DEFAULT_CHECKLISTS: Record<string, IssueChecklist[]> = {
  cancellation: [
    { id: 'notify_student', label: '학생/학부모에게 취소 안내', done: false },
    { id: 'reschedule', label: '대체 수업 일정 확정', done: false },
    { id: 'update_schedule', label: '스케줄 업데이트 완료', done: false },
    { id: 'coach_confirm', label: '코치에게 변경 확인', done: false },
  ],
  coach_change: [
    { id: 'notify_student', label: '학생/학부모에게 코치 변경 안내', done: false },
    { id: 'new_coach_assign', label: '새 코치 배정 완료', done: false },
    { id: 'handover', label: '인수인계 내용 전달', done: false },
    { id: 'first_session_confirm', label: '첫 수업 일정 확인', done: false },
  ],
  no_show: [
    { id: 'contact_student', label: '학생/학부모 연락 시도', done: false },
    { id: 'reason_confirmed', label: '결석 사유 확인', done: false },
    { id: 'makeup_scheduled', label: '보충 수업 일정 확정', done: false },
  ],
  custom: [],
};

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const eventId = req.nextUrl.searchParams.get('eventId');
  const status = req.nextUrl.searchParams.get('status');
  const resolvedSince = req.nextUrl.searchParams.get('resolvedSince');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10);

  let query = supabaseAdmin.from('srm_event_issues').select('*');

  if (eventId) {
    query = query.eq('event_id', eventId);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (resolvedSince) {
    query = query.gte('resolved_at', resolvedSince);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []) as EventIssue[]);
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { eventId, issueType, title, description, checklist, createdBy, studentName, coachName } = body;

  if (!eventId || !issueType || !title) {
    return NextResponse.json({ error: 'eventId, issueType, title required' }, { status: 400 });
  }

  const finalChecklist = checklist ?? DEFAULT_CHECKLISTS[issueType] ?? [];

  const { data, error } = await supabaseAdmin
    .from('srm_event_issues')
    .insert({
      event_id: eventId,
      issue_type: issueType,
      title,
      description: description ?? null,
      checklist: finalChecklist,
      created_by: createdBy ?? null,
      student_name: studentName ?? null,
      coach_name: coachName ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as EventIssue);
}
