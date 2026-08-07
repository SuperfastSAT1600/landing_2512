import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function isAuthorized(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY;
}

function generateCode(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('vocab_access_codes')
    .select('id, instagram_id, code, is_active, created_at, first_used_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ codes: data });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { instagram_id } = await req.json() as { instagram_id?: string };
  if (!instagram_id?.trim()) {
    return NextResponse.json({ error: 'instagram_id is required' }, { status: 400 });
  }

  const normalized = instagram_id.trim().replace(/^@/, '').toLowerCase();
  const code = generateCode();

  const { data, error } = await supabaseAdmin
    .from('vocab_access_codes')
    .insert({ instagram_id: normalized, code })
    .select('id, instagram_id, code')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 코드가 발급된 계정입니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
