import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { slugifyConcept } from '@/lib/mathweb-concept-slug';

function isAuthorized(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

  let query = supabaseAdmin
    .from('math_concepts')
    .select('id, name, slug, usage_count')
    .order('usage_count', { ascending: false })
    .order('name', { ascending: true })
    .limit(limit);

  if (q.trim()) {
    const prefix = slugifyConcept(q);
    if (prefix) {
      query = query.ilike('slug', `${prefix}%`);
    }
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json(
    { data: data ?? [], meta: { requestId: crypto.randomUUID() } },
    {
      headers: { 'Cache-Control': 'private, max-age=30' },
    }
  );
}
