import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Params = Promise<{ code: string }>;

// GET /api/destiny/rooms/[code] — 방 멤버 조회
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { code } = await params;
  const { data, error } = await supabase
    .from('destiny_rooms')
    .select('members, updated_at')
    .eq('code', code)
    .single();

  if (error || !data) {
    return NextResponse.json({ members: [] }, { status: 200 });
  }
  return NextResponse.json({ members: data.members, updated_at: data.updated_at });
}

// POST /api/destiny/rooms/[code] — 멤버 추가 (방 없으면 생성)
export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { code } = await params;
  const body = await req.json();
  const { nick, uniIdx, pct } = body;

  if (!nick || uniIdx === undefined || !pct) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const newMember = { nick, uniIdx, pct };

  const { data: existing } = await supabase
    .from('destiny_rooms')
    .select('members')
    .eq('code', code)
    .single();

  if (existing) {
    const members: typeof newMember[] = existing.members || [];
    const idx = members.findIndex((m) => m.nick === nick);
    if (idx >= 0) members[idx] = newMember;
    else members.push(newMember);

    await supabase
      .from('destiny_rooms')
      .update({ members, updated_at: new Date().toISOString() })
      .eq('code', code);
  } else {
    await supabase
      .from('destiny_rooms')
      .insert({ code, members: [newMember] });
  }

  return NextResponse.json({ ok: true });
}
