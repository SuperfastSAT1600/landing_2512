import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { randomBytes } from 'crypto';

// GET — list all partner portals
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('partner_portals')
    .select('id, token, name, student_names, passcode_hash, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map(p => ({
      id: p.id,
      token: p.token as string,
      name: p.name as string,
      studentNames: (p.student_names as string[]) ?? [],
      hasPasscode: p.passcode_hash != null,
      createdAt: p.created_at,
      url: `/partner/${p.token as string}`,
    }))
  );
}

// POST — create a new partner portal
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const token = randomBytes(12).toString('base64url');
  const studentNames: string[] = Array.isArray(body.studentNames) ? body.studentNames : [];

  const { data, error } = await supabaseAdmin
    .from('partner_portals')
    .insert({ token, name: body.name as string, student_names: studentNames })
    .select('id, token, name, student_names, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: data.id,
    token: data.token as string,
    name: data.name as string,
    studentNames: (data.student_names as string[]) ?? [],
    hasPasscode: false,
    createdAt: data.created_at,
    url: `/partner/${data.token as string}`,
  }, { status: 201 });
}
