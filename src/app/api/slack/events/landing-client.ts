import type { Topic } from './blog-writer';

export async function saveLandingDraft(
  title: string, html: string, slug: string, topic: Topic,
  description = '', focusKeyword = '', featuredImage = ''
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const excerpt = description || topic.rationale || title;

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
      excerpt: excerpt.slice(0, 300),
      description: excerpt.slice(0, 155),
      featured_image: featuredImage || null,
      category: 'SAT',
      tags: ['SAT', 'blog-agent'],
      author: 'SuperfastSAT',
      date: new Date().toISOString().split('T')[0],
      focus_keyword: focusKeyword || title.split(' ').slice(0, 3).join(' '),
      cta_featured: false,
      is_published: false,
    }),
  });

  if (res.status !== 200 && res.status !== 201) {
    const err = await res.text();
    throw new Error(`랜딩 draft 실패: ${res.status} ${err}`);
  }
  const data = await res.json() as { id: string }[];
  return data[0]?.id ?? slug;
}

export async function updateLandingThumbnail(landingId: string, featuredImageUrl: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  await fetch(`${supabaseUrl}/rest/v1/posts?id=eq.${encodeURIComponent(landingId)}`, {
    method: 'PATCH',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ featured_image: featuredImageUrl }),
  });
}

export async function publishLandingPost(landingId: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/posts?id=eq.${encodeURIComponent(landingId)}`, {
    method: 'PATCH',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ is_published: true }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`랜딩 발행 실패: ${res.status} ${err}`);
  }
  return `https://tutoring.superfastsat.com/blog/${landingId}`;
}
