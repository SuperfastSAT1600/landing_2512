import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import type { WinbackPlayStatus } from '@/types/crm';

const STATUSES: WinbackPlayStatus[] = ['draft', 'running', 'done', 'archived'];

/** 목록 화면용 경량 롤업 — 타겟 수·발송·반응·전환만 센다(상세 지표는 2차 PR). */
async function rollupByPlay(playIds: string[]) {
  const rollup = new Map<string, { targeted: number; sent: number; responded: number; converted: number }>();
  if (playIds.length === 0) return rollup;

  const { data } = await supabaseAdmin
    .from('winback_targets')
    .select('play_id, status, sent_at, response, converted_at')
    .in('play_id', playIds);

  for (const row of (data ?? []) as Array<{
    play_id: string;
    status: string;
    sent_at: string | null;
    response: string | null;
    converted_at: string | null;
  }>) {
    const entry = rollup.get(row.play_id) ?? { targeted: 0, sent: 0, responded: 0, converted: 0 };
    if (row.status !== 'skipped') entry.targeted++;
    if (row.sent_at) entry.sent++;
    if (row.response && row.response !== 'none') entry.responded++;
    if (row.converted_at) entry.converted++;
    rollup.set(row.play_id, entry);
  }
  return rollup;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = new URL(request.url).searchParams.get('status');
  let query = supabaseAdmin
    .from('winback_plays')
    .select('*')
    .order('created_at', { ascending: false });
  if (status && STATUSES.includes(status as WinbackPlayStatus)) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    console.error('[winback-plays GET]', error);
    return NextResponse.json({ error: `플레이 목록을 불러오지 못했습니다: ${error.message}` }, { status: 500 });
  }

  const plays = data ?? [];
  const rollup = await rollupByPlay(plays.map((p) => p.id));
  const withStats = plays.map((p) => ({
    ...p,
    rollup: rollup.get(p.id) ?? { targeted: 0, sent: 0, responded: 0, converted: 0 },
  }));

  return NextResponse.json({ data: withStats });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const productBrief = typeof body.product_brief === 'string' ? body.product_brief.trim() : '';
  if (!title) return NextResponse.json({ error: '플레이 제목을 입력해주세요.' }, { status: 400 });
  if (!productBrief) {
    return NextResponse.json({ error: '판매할 상품 설명(브리프)을 입력해주세요.' }, { status: 400 });
  }

  const insert = {
    title,
    product_brief: productBrief,
    product_category: (body.product_category as string)?.trim() || null,
    product_price: body.product_price ?? null,
    product_hours: body.product_hours ?? null,
    target_exam_date: (body.target_exam_date as string) || null,
    audience_hint: (body.audience_hint as string)?.trim() || null,
    rule_filters: body.rule_filters ?? {},
    conversion_window_days: body.conversion_window_days ?? 45,
    contact_cooldown_days: body.contact_cooldown_days ?? 30,
    status: STATUSES.includes(body.status as WinbackPlayStatus) ? (body.status as string) : 'running',
    created_by: (body.created_by as string)?.trim() || null,
  };

  const { data: play, error } = await supabaseAdmin
    .from('winback_plays')
    .insert(insert)
    .select()
    .single();

  if (error || !play) {
    console.error('[winback-plays POST]', error);
    return NextResponse.json({ error: `플레이 생성에 실패했습니다: ${error?.message}` }, { status: 500 });
  }

  // 전략 변형(A/B) — 없으면 "기본" 하나를 만들어 이후 집계가 항상 변형 단위로 떨어지게 한다.
  const rawVariants = Array.isArray(body.variants) ? body.variants : [];
  const variantRows = (rawVariants.length > 0 ? rawVariants : [{ name: '기본' }])
    .map((v, i) => {
      const row = v as { name?: string; angle?: string };
      const name = row.name?.trim();
      return name ? { play_id: play.id, name, angle: row.angle?.trim() || null, sort_order: i } : null;
    })
    .filter((v): v is { play_id: string; name: string; angle: string | null; sort_order: number } => v !== null);

  const { data: variants, error: variantError } = await supabaseAdmin
    .from('winback_play_variants')
    .insert(variantRows)
    .select();

  if (variantError) {
    console.error('[winback-plays POST variants]', variantError);
    return NextResponse.json(
      { error: `전략 변형 생성에 실패했습니다: ${variantError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { ...play, variants: variants ?? [] } }, { status: 201 });
}
