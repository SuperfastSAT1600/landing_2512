import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface CrmCandidate {
  id: string;
  name: string;
  grade: string | null;
  sfv2_profile_id: string | null;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  let query = supabaseAdmin
    .from('students')
    .select('id, name, grade, sfv2_profile_id')
    .order('name');

  if (q) query = query.ilike('name', `%${q}%`);

  const { data, error } = await query.limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
