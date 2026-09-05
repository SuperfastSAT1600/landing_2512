import { SKELETON_SYSTEM, GHOST_PROSE_SYSTEM, LANDING_PROSE_SYSTEM } from './blog-prompts';
import { matchRelatedPosts, buildRelatedPostsContext } from './post-memory';

export type Topic = { n?: number; title: string; rationale: string; point: string };
export type BlogDraft = { ghostMarkdown: string; landingMarkdown: string; slug: string; title: string; focusKeyword: string };

const QWEN_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const QWEN_MODEL = 'qwen-plus';

// ─── API Call ─────────────────────────────────────────────────────────────────

async function qwenChat(system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY is not set');

  const res = await fetch(QWEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status} ${err}`);
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── API Calls ────────────────────────────────────────────────────────────────

async function generateSkeleton(topic: Topic): Promise<Record<string, unknown>> {
  const text = await qwenChat(
    SKELETON_SYSTEM,
    `주제: ${topic.title}\n근거: ${topic.rationale || '없음'}\n핵심 포인트: ${topic.point || '없음'}\n오늘 날짜: ${new Date().toISOString().slice(0, 10)}\n\n골격 JSON을 반환해주세요.`,
    2000
  );
  const stripped = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return {};
  try { return JSON.parse(stripped.slice(start, end + 1)); } catch { return {}; }
}

async function generateGhostProse(
  topic: Topic, skeleton: Record<string, unknown>, relatedContext: string
): Promise<string> {
  const systemPrompt = relatedContext ? GHOST_PROSE_SYSTEM + relatedContext : GHOST_PROSE_SYSTEM;
  return qwenChat(
    systemPrompt,
    `주제: ${topic.title}\n오늘 날짜: ${new Date().toISOString().slice(0, 10)}\n\n골격:\n${JSON.stringify(skeleton, null, 2)}\n\n위 골격을 따라 Ghost 블로그 포스팅을 마크다운으로 작성해주세요.`,
    8000
  );
}

async function generateLandingProse(
  topic: Topic, skeleton: Record<string, unknown>, relatedContext: string
): Promise<string> {
  const systemPrompt = relatedContext ? LANDING_PROSE_SYSTEM + relatedContext : LANDING_PROSE_SYSTEM;
  return qwenChat(
    systemPrompt,
    `주제: ${topic.title}\n오늘 날짜: ${new Date().toISOString().slice(0, 10)}\n\n골격:\n${JSON.stringify(skeleton, null, 2)}\n\n위 골격을 따라 랜딩 페이지 블로그를 마크다운으로 작성해주세요.`,
    10000
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function extractSlugFromMarkdown(markdown: string, title: string): string {
  const slugMatch = markdown.match(/^slug:\s*(.+)$/m);
  if (slugMatch) return slugMatch[1].trim().replace(/^["']|["']$/g, '');
  return title.toLowerCase().replace(/[^\w\s가-힣]/g, '').trim()
    .replace(/\s+/g, '-').slice(0, 60) + '-' + Date.now().toString(36);
}

export async function writeBlog(topic: Topic, platform: 'ghost' | 'landing' | 'both' = 'both'): Promise<BlogDraft> {
  const queryText = `${topic.title}\n${topic.rationale || ''}\n${topic.point || ''}`;
  const relatedPosts = await matchRelatedPosts(queryText, 3, 0.65);
  const relatedContext = buildRelatedPostsContext(relatedPosts);

  if (relatedPosts.length > 0) {
    console.log(`[blog-writer] related posts found: ${relatedPosts.map(p => p.title).join(', ')}`);
  }

  const skeleton = await generateSkeleton(topic);
  const ghostMarkdown = (platform === 'ghost' || platform === 'both')
    ? await generateGhostProse(topic, skeleton, relatedContext)
    : '';
  const landingMarkdown = (platform === 'landing' || platform === 'both')
    ? await generateLandingProse(topic, skeleton, relatedContext)
    : '';

  const baseMarkdown = ghostMarkdown || landingMarkdown;
  const slug = extractSlugFromMarkdown(baseMarkdown, topic.title);
  const focusKeyword = (skeleton.focus_keyword as string | undefined) || topic.title;
  // 골격의 meta_title을 SEO 제목으로 사용 (없으면 Slack 요청 텍스트 폴백)
  const title = (skeleton.meta_title as string | undefined)?.trim() || topic.title;
  return { ghostMarkdown, landingMarkdown, slug, title, focusKeyword };
}
