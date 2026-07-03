import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isAuthenticated } from '@/lib/server-auth';

export interface V2Teacher {
  id: string;
  full_name: string;
  email: string | null;
}

// GET /api/admin/coaches/v2-teachers
// v2 플랫폼에서 role='teacher'인 유저 목록 반환
export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseSFv2
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'teacher')
    .order('full_name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
