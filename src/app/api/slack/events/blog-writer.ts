import Anthropic from '@anthropic-ai/sdk';
import { SKELETON_SYSTEM, GHOST_PROSE_SYSTEM, LANDING_PROSE_SYSTEM } from './blog-prompts';

export type Topic = { n?: number; title: string; rationale: string; point: string };
export type BlogDraft = { ghostMarkdown: string; landingMarkdown: string; slug: string; title: string; focusKeyword: string };

// ─── API Calls ────────────────────────────────────────────────────────────────

async function generateSkeleton(
  topic: Topic, client: Anthropic
): Promise<Record<string, unknown>> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SKELETON_SYSTEM,
    messages: [{
      role: 'user',
      content: `주제: ${topic.title}\n근거: ${topic.rationale || '없음'}\n핵심 포인트: ${topic.point || '없음'}\n오늘 날짜: ${new Date().toISOString().slice(0, 10)}\n\n골격 JSON을 반환해주세요.`,
    }],
  });
  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  // Strip markdown code fences, then extract outermost JSON object
  const stripped = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return {};
  try { return JSON.parse(stripped.slice(start, end + 1)); } catch { return {}; }
}

async function generateGhostProse(
  topic: Topic, skeleton: Record<string, unknown>, client: Anthropic
): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: GHOST_PROSE_SYSTEM,
    messages: [{
      role: 'user',
      content: `주제: ${topic.title}\n오늘 날짜: ${new Date().toISOString().slice(0, 10)}\n\n골격:\n${JSON.stringify(skeleton, null, 2)}\n\n위 골격을 따라 Ghost 블로그 포스팅을 마크다운으로 작성해주세요.`,
    }],
  });
  return response.content[0].type === 'text' ? response.content[0].text : '';
}

async function generateLandingProse(
  topic: Topic, skeleton: Record<string, unknown>, client: Anthropic
): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 10000,
    system: LANDING_PROSE_SYSTEM,
    messages: [{
      role: 'user',
      content: `주제: ${topic.title}\n오늘 날짜: ${new Date().toISOString().slice(0, 10)}\n\n골격:\n${JSON.stringify(skeleton, null, 2)}\n\n위 골격을 따라 랜딩 페이지 블로그를 마크다운으로 작성해주세요.`,
    }],
  });
  return response.content[0].type === 'text' ? response.content[0].text : '';
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function extractSlugFromMarkdown(markdown: string, title: string): string {
  const slugMatch = markdown.match(/^slug:\s*(.+)$/m);
  if (slugMatch) return slugMatch[1].trim().replace(/^["']|["']$/g, '');
  return title.toLowerCase().replace(/[^\w\s가-힣]/g, '').trim()
    .replace(/\s+/g, '-').slice(0, 60) + '-' + Date.now().toString(36);
}

export async function writeBlog(topic: Topic): Promise<BlogDraft> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const skeleton = await generateSkeleton(topic, client);
  const ghostMarkdown = await generateGhostProse(topic, skeleton, client);
  const landingMarkdown = await generateLandingProse(topic, skeleton, client);

  const slug = extractSlugFromMarkdown(ghostMarkdown, topic.title);
  const focusKeyword = (skeleton.focus_keyword as string | undefined) || topic.title;
  return { ghostMarkdown, landingMarkdown, slug, title: topic.title, focusKeyword };
}
