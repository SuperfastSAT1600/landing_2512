import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

const ATTENDANCE_STATUSES = new Set(['on_time', 'late', 'late_present', 'late_absent', 'absent']);
const LEARNING_STATUSES = new Set(['normal_study', 'disconnected', 'disconnected_end', 'returned', 'completed', 'abnormal_end']);
const ATTENDED_STATUSES = new Set(['on_time', 'late_present']);
const ABSENT_STATUSES = new Set(['absent', 'late_absent']);
const DISCONNECTED_STATUSES = new Set(['disconnected', 'disconnected_end']);

export interface DayStats {
  date: string;
  totalScheduled: number;
  attended: number;
  absent: number;
  unresolved: number;
  totalLearning: number;
  disconnected: number;
  attendanceRate: number | null;
  disconnectionRate: number | null;
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const startDate = req.nextUrl.searchParams.get('startDate');
  const endDate = req.nextUrl.searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'startDate and endDate required' } },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from('srm_session_status_logs')
    .select('event_date, student_name, status')
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true });

  if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });

  // Group by date → student
  const byDate = new Map<string, Map<string, Set<string>>>();
  for (const row of data ?? []) {
    if (!byDate.has(row.event_date)) byDate.set(row.event_date, new Map());
    const byStudent = byDate.get(row.event_date)!;
    if (!byStudent.has(row.student_name)) byStudent.set(row.student_name, new Set());
    byStudent.get(row.student_name)!.add(row.status);
  }

  const result: DayStats[] = [];

  for (const [date, students] of byDate) {
    let attended = 0, absent = 0, unresolved = 0;
    let totalLearning = 0, disconnected = 0;

    for (const statuses of students.values()) {
      const hasAttendanceLog = [...statuses].some((s) => ATTENDANCE_STATUSES.has(s));
      if (hasAttendanceLog) {
        if ([...statuses].some((s) => ATTENDED_STATUSES.has(s))) attended++;
        else if ([...statuses].some((s) => ABSENT_STATUSES.has(s))) absent++;
        else unresolved++;
      }

      const hasLearning = [...statuses].some((s) => LEARNING_STATUSES.has(s));
      if (hasLearning) {
        totalLearning++;
        if ([...statuses].some((s) => DISCONNECTED_STATUSES.has(s))) disconnected++;
      }
    }

    const totalScheduled = attended + absent + unresolved;
    const totalResolved = attended + absent;
    result.push({
      date,
      totalScheduled,
      attended,
      absent,
      unresolved,
      totalLearning,
      disconnected,
      attendanceRate: totalResolved > 0 ? Math.round((attended / totalResolved) * 100) : null,
      disconnectionRate: totalLearning > 0 ? Math.round((disconnected / totalLearning) * 100) : null,
    });
  }

  // Fill dates with no logs as empty entries
  const filled = fillEmptyDates(startDate, endDate, result);

  return NextResponse.json({ data: filled });
}

function fillEmptyDates(startDate: string, endDate: string, stats: DayStats[]): DayStats[] {
  const map = new Map(stats.map((s) => [s.date, s]));
  const result: DayStats[] = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    const d = cur.toISOString().slice(0, 10);
    result.push(map.get(d) ?? {
      date: d, totalScheduled: 0, attended: 0, absent: 0, unresolved: 0,
      totalLearning: 0, disconnected: 0, attendanceRate: null, disconnectionRate: null,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}
