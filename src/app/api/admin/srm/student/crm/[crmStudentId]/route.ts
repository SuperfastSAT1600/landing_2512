import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ crmStudentId: string }> }
) {
  const { crmStudentId } = await params;

  const { data: crmStudent, error } = await supabaseAdmin
    .from('students')
    .select('id, name, grade, consultation_timeline, funnel_stage, sfv2_profile_id')
    .eq('id', crmStudentId)
    .single();

  if (error || !crmStudent) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    profile: null,
    crmStudent,
  });
}
