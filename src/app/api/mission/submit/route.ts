import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';

const SubmitSchema = z.object({
  instagram_username: z.string().min(1).transform((v) => v.replace(/^@/, '').toLowerCase()),
  display_name: z.string().min(1).max(50),
  photo_url: z.string().url().optional(),
  rep_count: z.number().int().positive().max(10000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON', message: '잘못된 요청입니다.' } }, { status: 400 });
  }

  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } }, { status: 400 });
  }

  const { instagram_username, display_name, photo_url, rep_count, date } = parsed.data;
  const submissionDate = date ?? new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('mission_submissions')
    .insert({ instagram_username, display_name, photo_url, rep_count, date: submissionDate })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: { code: 'DUPLICATE', message: '오늘 이미 인증을 제출했습니다.' } }, { status: 409 });
    }
    console.error('[mission/submit]', error);
    return NextResponse.json({ error: { code: 'DB_ERROR', message: '저장 중 오류가 발생했습니다.' } }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
