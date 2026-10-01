import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const testId = searchParams.get('testId');

  if (!code || !testId) return NextResponse.json({ remaining: null });

  const normalizedCode = code.trim().toUpperCase();

  const { data: codeRow } = await supabaseAdmin
    .from('test_codes')
    .select('id, max_uses, is_active, expires_at')
    .eq('code', normalizedCode)
    .eq('test_id', testId)
    .maybeSingle();

  if (!codeRow || !codeRow.is_active) return NextResponse.json({ remaining: null });
  if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) return NextResponse.json({ remaining: null });

  const { count } = await supabaseAdmin
    .from('test_code_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('code_id', codeRow.id);

  return NextResponse.json({ remaining: Math.max(0, codeRow.max_uses - (count ?? 0)) });
}
