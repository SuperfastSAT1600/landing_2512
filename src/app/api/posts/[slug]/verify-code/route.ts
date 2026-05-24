import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { remark } from 'remark';
import html from 'remark-html';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let code: string;
  try {
    const body = await _req.json();
    code = String(body.code ?? '').trim();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: '6자리 숫자를 입력해주세요.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('access_code, content')
    .eq('id', slug)
    .eq('is_published', true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '포스팅을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (!data.access_code) {
    return NextResponse.json({ error: '이 포스팅은 잠금이 없습니다.' }, { status: 404 });
  }

  if (data.access_code !== code) {
    return NextResponse.json({ error: '코드가 올바르지 않습니다.' }, { status: 401 });
  }

  const rawContent = (data.content as string) || '';
  const isHtml = rawContent.trim().startsWith('<');
  const contentHtml = isHtml
    ? rawContent
    : (await remark().use(html, { allowDangerousHtml: true }).process(rawContent)).toString();

  return NextResponse.json({ content: contentHtml });
}
