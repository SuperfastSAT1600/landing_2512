import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isAuthenticated } from '@/lib/server-auth';

export interface V2Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

// GET /api/admin/srm/v2-search?q=이름
// sfv2 profiles에서 이름 검색 (읽기 전용)
export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ data: [] });

  const { data, error } = await supabaseSFv2
    .from('profiles')
    .select('id, full_name, email, phone')
    .ilike('full_name', `%${q}%`)
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
