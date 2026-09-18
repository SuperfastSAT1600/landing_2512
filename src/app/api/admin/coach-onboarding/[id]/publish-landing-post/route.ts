import { NextRequest, NextResponse } from 'next/server';
import { marked } from 'marked';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export const maxDuration = 30;

type Params = { params: Promise<{ id: string }> };

function extractSection(markdown: string, key: string): string {
  const regex = new RegExp(`\\*\\*${key}\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*|$)`);
  return markdown.match(regex)?.[1]?.trim() ?? '';
}

function stripTrailingMeta(markdown: string): string {
  const idx = markdown.lastIndexOf('\n---');
  return idx !== -1 ? markdown.slice(0, idx).trim() : markdown.trim();
}

function titleToSlug(title: string, id: string): string {
  const base = title
    .replace(/[^\w\s가-힣0-9]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
  return `${base}-${id.slice(0, 6)}`;
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json() as { content?: string; featuredImage?: string; title?: string };
  const markdown = body.content?.trim();
  const featuredImage = body.featuredImage?.trim() ?? '';
  if (!markdown) {
    return NextResponse.json({ error: '내용이 없습니다.' }, { status: 400 });
  }

  const { data: submission, error } = await supabaseAdmin
    .from('coach_onboarding_submissions')
    .select('name')
    .eq('id', id)
    .single();

  if (error || !submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const name = (submission as { name: string }).name;
  const title = body.title?.trim() || `${name} 선생님 소개`;
  const slug = titleToSlug(title, id);

  const excerpt = extractSection(markdown, 'Excerpt');
  const description = extractSection(markdown, 'Meta Description');
  const bodyMarkdown = stripTrailingMeta(markdown);
  const html = await marked(bodyMarkdown);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/posts`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: slug,
      title,
      content: html,
      excerpt: excerpt.slice(0, 300) || title,
      description: description.slice(0, 155) || title,
      category: '코치소개',
      tags: ['코치', '선생님소개'],
      author: name,
      date: new Date().toISOString().split('T')[0],
      focus_keyword: `${name} SAT 과외`,
      featured_image: featuredImage || undefined,
      cta_featured: false,
      is_published: true,
    }),
  });

  if (res.status !== 200 && res.status !== 201) {
    const err = await res.text();
    return NextResponse.json({ error: `발행 실패: ${res.status} ${err.slice(0, 200)}` }, { status: 500 });
  }

  const url = `https://tutoring.superfastsat.com/blog/${slug}`;
  return NextResponse.json({ data: { url, slug } });
}
