import type { Topic } from './blog-writer';

export async function saveLandingDraft(
  title: string, html: string, slug: string, topic: Topic
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/posts`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      id: slug,
      title,
      content: html,
      excerpt: (topic.rationale || title).slice(0, 120),
      description: (topic.rationale || title).slice(0, 120),
      featured_image: null,
      category: 'SAT',
      tags: ['SAT', 'blog-agent'],
      author: 'SuperfastSAT',
      date: new Date().toISOString().split('T')[0],
      focus_keyword: title.split(' ').slice(0, 3).join(' '),
      cta_featured: false,
      is_published: false,
    }),
  });

  if (res.status !== 201) {
    const err = await res.text();
    throw new Error(`랜딩 draft 실패: ${res.status} ${err}`);
  }
  const data = await res.json() as { id: string }[];
  return data[0]?.id ?? slug;
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
  return `https://superfastsat.com/blog/${landingId}`;
}
