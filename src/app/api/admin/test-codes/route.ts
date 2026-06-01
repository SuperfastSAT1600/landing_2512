import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function isAuthorized(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const testId = searchParams.get('testId');

  let query = supabaseAdmin
    .from('test_codes')
    .select('id, code, test_id, label, max_uses, is_active, created_at, expires_at')
    .order('created_at', { ascending: false });

  if (testId) {
    query = query.eq('test_id', testId);
  }

  const { data: codes, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count registrations for each code
  const codesWithUsage = await Promise.all(
    (codes ?? []).map(async (c) => {
      const { count } = await supabaseAdmin
        .from('test_code_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('code_id', c.id);
      return { ...c, usedCount: count ?? 0 };
    })
  );

  return NextResponse.json({ codes: codesWithUsage });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { code, testId, label, maxUses, expiresAt } = body as {
    code?: string;
    testId?: string;
    label?: string;
    maxUses?: number;
    expiresAt?: string;
  };

  if (!code || !testId) {
    return NextResponse.json({ error: 'code and testId are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('test_codes')
    .insert({
      code: code.toUpperCase(),
      test_id: testId,
      label: label ?? '',
      max_uses: maxUses ?? 50,
      expires_at: expiresAt ?? null,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
