import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { randomBytes } from 'crypto';

// GET — list all partner portals with CRM-linked students
export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('partner_portals')
    .select('id, token, name, passcode_hash, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const portalNames = (data ?? []).map(p => p.name as string);

  const { data: crmStudents } = portalNames.length
    ? await supabaseAdmin
        .from('students')
        .select('name, portal_name, b2b_partner, lead_status')
        .in('b2b_partner', portalNames)
    : { data: [] };

  const studentsByPartner = new Map<string, Array<{ name: string; isActive: boolean }>>();
  for (const s of crmStudents ?? []) {
    const partner = s.b2b_partner as string;
    if (!studentsByPartner.has(partner)) studentsByPartner.set(partner, []);
    studentsByPartner.get(partner)!.push({
      name: (s.portal_name as string | null) || (s.name as string),
      isActive: (s.lead_status as string) !== 'inactive',
    });
  }

  return NextResponse.json(
    (data ?? []).map(p => ({
      id: p.id,
      token: p.token as string,
      name: p.name as string,
      crmStudents: studentsByPartner.get(p.name as string) ?? [],
      hasPasscode: p.passcode_hash != null,
      createdAt: p.created_at,
      url: `/partner/${p.token as string}`,
    }))
  );
}

// POST — create a new partner portal
export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const token = randomBytes(12).toString('base64url');

  const { data, error } = await supabaseAdmin
    .from('partner_portals')
    .insert({ token, name: body.name as string })
    .select('id, token, name, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: data.id,
    token: data.token as string,
    name: data.name as string,
    crmStudents: [],
    hasPasscode: false,
    createdAt: data.created_at,
    url: `/partner/${data.token as string}`,
  }, { status: 201 });
}
