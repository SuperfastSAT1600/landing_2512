import { marked } from 'marked';
import type { Topic, BlogDraft } from './blog-writer';
import { writeBlog } from './blog-writer';
import { saveGhostDraft, publishGhostPost, uploadImageToGhost } from './ghost-client';
import { saveLandingDraft, publishLandingPost } from './landing-client';
import { generateThumbnailUrl } from './thumbnail-generator';
import { postSlack, getDraftFromThread, BLOG_CHANNEL } from './slack-utils';
import { generateTopics, buildTopicMessage } from './topic-suggester';

function extractFrontmatter(markdown: string): Record<string, string> {
  const match = markdown.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)/);
    if (kv) result[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return result;
}

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]+?\n---\n?/, '').trim();
}

async function generateAndUploadThumbnail(focusKeyword: string, slug: string): Promise<string> {
  const dalleUrl = await generateThumbnailUrl(focusKeyword);
  return uploadImageToGhost(dalleUrl, `thumbnail-${slug}.png`);
}

async function saveDrafts(
  draft: BlogDraft, topic: Topic, thumbnailUrl: string
): Promise<{ ghostId: string; landingId: string }> {
  const ghostHtml = await marked(stripFrontmatter(draft.ghostMarkdown));
  const landingHtml = await marked(stripFrontmatter(draft.landingMarkdown));

  const meta = extractFrontmatter(draft.ghostMarkdown);
  const focusKeyword = meta.focus_keyword || draft.focusKeyword;
  const description = meta.description || topic.rationale || draft.title;

  const [ghostResult, landingResult] = await Promise.allSettled([
    saveGhostDraft(draft.title, ghostHtml, draft.slug, meta.description || ''),
    saveLandingDraft(draft.title, landingHtml, draft.slug, topic, description, focusKeyword, thumbnailUrl),
  ]);

  if (ghostResult.status === 'rejected') throw new Error(`Ghost 저장 실패: ${ghostResult.reason?.message}`);
  if (landingResult.status === 'rejected') throw new Error(`랜딩 저장 실패: ${landingResult.reason?.message}`);

  return { ghostId: ghostResult.value.id, landingId: landingResult.value };
}

export async function handleBlogWrite(
  topic: Topic, channel: string, threadTs: string
): Promise<void> {
  await postSlack(channel,
    `블로그 작성을 시작합니다.\n\n제목: ${topic.title}\n\n골격 설계 → Ghost 산문 → 랜딩 산문 순서로 작성합니다. 약 3~5분 소요됩니다.`,
    threadTs
  );

  const draft = await writeBlog(topic);

  // 썸네일 생성 (실패해도 초안 저장은 계속)
  let thumbnailUrl = '';
  try {
    thumbnailUrl = await generateAndUploadThumbnail(draft.focusKeyword, draft.slug);
  } catch (err) {
    console.error('[thumbnail] 생성 실패, 이미지 없이 저장합니다:', err);
  }

  const { ghostId, landingId } = await saveDrafts(draft, topic, thumbnailUrl);

  const excerpt = stripFrontmatter(draft.ghostMarkdown)
    .replace(/#{1,3} .+\n/g, '').replace(/\n+/g, ' ').trim().slice(0, 200);
  const meta = `[blog-agent: ghost_id=${ghostId}|landing_id=${landingId}|title=${encodeURIComponent(draft.title)}]`;

  await postSlack(
    channel,
    `${meta}\n\n*블로그 초안 완성 — 확인해주세요*\n\n*제목:* ${draft.title}\n\n*요약:*\n${excerpt}...\n\n> 발행하려면 이 스레드에서 *@landingpage 발행할게요* 라고 입력해주세요.`,
    threadTs
  );
}

export async function handleTopicSuggest(
  n: number, channel: string, threadTs: string
): Promise<void> {
  await postSlack(channel, `주제 ${n}개를 생성 중입니다...`, threadTs);
  const topics = await generateTopics(n);
  if (!topics.length) {
    await postSlack(channel, '현재 적합한 주제를 찾을 수 없습니다. 직접 주제를 입력해주세요.', threadTs);
    return;
  }
  const message = buildTopicMessage(topics);
  // BLOG_CHANNEL에 발행 — getTodayTopics()가 파싱할 수 있도록
  await postSlack(BLOG_CHANNEL, message);
  // 요청 스레드에도 동일 내용 회신
  if (channel !== BLOG_CHANNEL || threadTs) {
    await postSlack(channel, message, threadTs);
  }
}

export async function handlePublish(channel: string, threadTs: string): Promise<void> {
  const meta = await getDraftFromThread(channel, threadTs);
  if (!meta) {
    await postSlack(channel, '이 스레드에서 작성된 블로그 초안을 찾을 수 없습니다.', threadTs);
    return;
  }

  await postSlack(channel, '발행을 시작합니다. 잠시만 기다려주세요...', threadTs);

  const [ghostResult, landingResult] = await Promise.allSettled([
    publishGhostPost(meta.ghostId),
    publishLandingPost(meta.landingId),
  ]);

  const ghostUrl = ghostResult.status === 'fulfilled'
    ? ghostResult.value
    : `(Ghost 발행 실패: ${ghostResult.reason?.message})`;
  const landingUrl = landingResult.status === 'fulfilled'
    ? landingResult.value
    : `(랜딩 발행 실패: ${landingResult.reason?.message})`;

  await postSlack(
    channel,
    `발행 완료!\n\n*제목:* ${meta.title}\nGhost: ${ghostUrl}\n랜딩: ${landingUrl}`,
    threadTs
  );
}
