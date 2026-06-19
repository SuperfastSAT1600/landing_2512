import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

const METRIC_KEYS = ['contact_rate', 'conversion_rate', 'avg_first_response_seconds', 'custom'];

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = new URL(request.url).searchParams.get('status');
  let query = supabaseAdmin
    .from('growth_experiments')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && ['planned', 'running', 'done'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[experiments GET]', error);
    return NextResponse.json({ error: '실험 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
  return NextResponse.json({ data });
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
  if (!title) {
    return NextResponse.json({ error: '실험 제목을 입력해주세요.' }, { status: 400 });
  }
  const metric_key = METRIC_KEYS.includes(body.metric_key as string)
    ? (body.metric_key as string)
    : 'contact_rate';

  const insert = {
    title,
    metric_key,
    hypothesis: (body.hypothesis as string)?.trim() || null,
    execution_plan: (body.execution_plan as string)?.trim() || null,
    segment_source: (body.segment_source as string) || null,
    custom_metric_label: (body.custom_metric_label as string)?.trim() || null,
    baseline_from: (body.baseline_from as string) || null,
    baseline_to: (body.baseline_to as string) || null,
    baseline_value: body.baseline_value ?? null,
    test_from: (body.test_from as string) || null,
    test_to: (body.test_to as string) || null,
    result_value: body.result_value ?? null,
    target_value: body.target_value ?? null,
    created_by: (body.created_by as string)?.trim() || null,
  };

  const { data, error } = await supabaseAdmin
    .from('growth_experiments')
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error('[experiments POST]', error);
    return NextResponse.json({ error: '실험 생성에 실패했습니다.' }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
