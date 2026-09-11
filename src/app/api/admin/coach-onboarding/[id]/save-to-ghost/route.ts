import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { saveGhostDraft, titleToSlug } from '@/app/api/slack/events/ghost-client';

type Params = { params: Promise<{ id: string }> };

function markdownToHtml(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^\*\*(.+?)\*\*/gm, '<strong>$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|h|s|p])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
    .trim();
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await params; // consume params

  let body: { content: string; doodleUrl?: string; coachName: string; excerpt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.content || !body.coachName) {
    return NextResponse.json({ error: 'content and coachName are required' }, { status: 400 });
  }

  // Extract title from markdown (first # heading or use coach name)
  const titleMatch = body.content.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1] ?? `${body.coachName} 선생님 소개`;

  // Extract excerpt from content after --- separator
  let excerpt = body.excerpt ?? '';
  if (!excerpt) {
    const excerptMatch = body.content.match(/\*\*Excerpt\*\*\s*\n([^\n*]+)/);
    excerpt = excerptMatch?.[1]?.trim() ?? '';
  }

  // Remove the trailing --- section from the HTML content
  const mainContent = body.content.split(/^---$/m)[0].trim();
  const html = markdownToHtml(mainContent);

  const slug = titleToSlug(title);

  try {
    const { id: ghostId, url } = await saveGhostDraft(
      title,
      html,
      slug,
      excerpt,
      body.doodleUrl ?? ''
    );
    return NextResponse.json({ data: { ghostId, url, slug } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
