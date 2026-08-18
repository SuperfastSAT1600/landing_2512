import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import crypto from 'crypto';

// POST /api/coach-onboarding/invite
// Admin only: create an onboarding invite link
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { coach_name: string; coach_email?: string; expires_days?: number; coach_slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { coach_name, coach_email, expires_days = 7, coach_slug } = body;
  if (!coach_name?.trim()) {
    return NextResponse.json({ error: 'coach_name is required' }, { status: 400 });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('coach_onboarding_invites')
    .insert({ token, coach_name: coach_name.trim(), coach_email: coach_email ?? null, expires_at, coach_slug: coach_slug ?? null })
    .select()
    .single();

  if (error) {
    console.error('[invite POST]', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  return NextResponse.json({ data: { ...data, url: `${baseUrl}/coach-onboarding/${token}` } });
}

// GET /api/coach-onboarding/invite — list invites (admin)
// ?coach_slug=xxx → 해당 코치의 최신 invite 1건 반환
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const coachSlug = request.nextUrl.searchParams.get('coach_slug');

  let query = supabaseAdmin
    .from('coach_onboarding_invites')
    .select('id, token, coach_slug, coach_name, expires_at, used_at, created_at')
    .order('created_at', { ascending: false });

  if (coachSlug) {
    query = query.eq('coach_slug', coachSlug).limit(1);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to fetch invite' }, { status: 500 });
    return NextResponse.json({ data: data?.[0] ?? null });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  return NextResponse.json({ data });
}
