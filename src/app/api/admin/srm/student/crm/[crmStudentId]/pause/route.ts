import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

async function getActivePauseByCrm(crmStudentId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabaseAdmin
    .from('student_pauses')
    .select('*')
    .eq('student_id', crmStudentId)
    .is('ended_at', null)
    .lte('pause_start', today)
    .or(`pause_until.is.null,pause_until.gte.${today}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ crmStudentId: string }> }
) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { crmStudentId } = await params;
  const pause = await getActivePauseByCrm(crmStudentId);
  return NextResponse.json({ pause });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ crmStudentId: string }> }
) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { crmStudentId } = await params;
  const body = await req.json() as { pause_until?: string | null; reason?: string; created_by?: string };

  const { data: student } = await supabaseAdmin
    .from('students')
    .select('sfv2_profile_id')
    .eq('id', crmStudentId)
    .maybeSingle();

  const { data, error } = await supabaseAdmin
    .from('student_pauses')
    .insert({
      student_id: crmStudentId,
      sfv2_profile_id: (student as { sfv2_profile_id?: string } | null)?.sfv2_profile_id ?? null,
      pause_start: new Date().toISOString().slice(0, 10),
      pause_until: body.pause_until ?? null,
      reason: body.reason ?? null,
      created_by: body.created_by ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pause: data });
}
