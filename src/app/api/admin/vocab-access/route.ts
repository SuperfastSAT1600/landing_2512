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
    .select('id, instagram_id, code, is_active, scope, created_at, first_used_at, lead_id, label')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ codes: data });
}

function buildAccessLinks(code: string, scope: string): string[] {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tutoring.superfastsat.com';
  if (scope === 'mathweb') return [`${base}/mathweb?c=${code}`];
  if (scope === 'both') return [`${base}/vocabcounter?c=${code}`, `${base}/mathweb?c=${code}`];
  return [`${base}/vocabcounter?c=${code}`];
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { instagram_id?: string; lead_id?: string; scope?: string };
  const scope = ['vocab', 'mathweb', 'both'].includes(body.scope ?? '') ? body.scope : 'vocab';
  const code = generateCode();

  // 리드 모드: lead_id 제공, instagram_id 없음
  if (body.lead_id?.trim()) {
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('name')
      .eq('id', body.lead_id.trim())
      .single();

    const label = student?.name ?? '리드';
    const { data, error } = await supabaseAdmin
      .from('vocab_access_codes')
      .insert({ instagram_id: null, lead_id: body.lead_id.trim(), label, code, scope })
      .select('id, code, scope, lead_id, label')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { ...data, access_links: buildAccessLinks(code, scope as string) },
      { status: 201 },
    );
  }

  // 직접 입력 모드: instagram_id 필수
  if (!body.instagram_id?.trim()) {
    return NextResponse.json({ error: 'instagram_id 또는 lead_id가 필요합니다.' }, { status: 400 });
  }

  const normalized = body.instagram_id.trim().replace(/^@/, '').toLowerCase();

  const { data, error } = await supabaseAdmin
    .from('vocab_access_codes')
    .insert({ instagram_id: normalized, code, scope })
    .select('id, instagram_id, code, scope')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 코드가 발급된 계정입니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
