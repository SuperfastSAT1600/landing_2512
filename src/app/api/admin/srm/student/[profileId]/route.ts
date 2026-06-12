import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;

  const [{ data: profile }, { data: crmStudent }] = await Promise.all([
    supabaseSFv2.from('profiles').select('id, full_name, email, phone, grade, role').eq('id', profileId).single(),
    supabaseAdmin.from('students').select('id, name, grade, consultation_timeline, funnel_stage, sfv2_profile_id').eq('sfv2_profile_id', profileId).maybeSingle(),
  ]);

  return NextResponse.json({
    profile: profile ?? null,
    crmStudent: crmStudent ?? null,
  });
}
