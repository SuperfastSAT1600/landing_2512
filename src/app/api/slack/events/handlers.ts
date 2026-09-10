import { marked } from 'marked';
import type { Topic, BlogDraft } from './blog-writer';
import { writeBlog } from './blog-writer';
import { saveGhostDraft, publishGhostPost, updateGhostThumbnail } from './ghost-client';
import { saveLandingDraft, publishLandingPost, updateLandingThumbnail } from './landing-client';
import { generateGhostThumbnail, generateLandingThumbnail } from './thumbnail-generator';
import { postSlack, getDraftFromThread, BLOG_CHANNEL } from './slack-utils';
import { generateTopics, buildTopicMessage } from './topic-suggester';
import { savePostEmbedding } from './post-memory';
import { reviewBlogDraft } from './blog-reviewer';
import { adviseBlogDraft } from './blog-adviser';

function extractFrontmatter(markdown: string): Record<string, string> {
  const match = markdown.match(/^```(?:yaml)?\s*\r?\n(---\r?\n[\s\S]+?\r?\n---)/m)
    ?? markdown.match(/^---\r?\n([\s\S]+?)\r?\n---/m);
  if (!match) return {};
  const block = match[1].replace(/^---\r?\n/, '');
  const result: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const kv = line.match(/^([\w_]+):\s*(.+)/);
    if (kv) result[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return result;
}

function stripFrontmatter(markdown: string): string {
  // 코드블록으로 감싼 경우: ```yaml\n---\n...\n---\n```
  const codeFenced = markdown.replace(/^```(?:yaml)?\s*\r?\n---\r?\n[\s\S]+?\r?\n---\s*\r?\n```\s*\r?\n?/m, '');
  if (codeFenced !== markdown) return codeFenced.trim();
  // 표준 프론트매터: ---\n...\n--- (\r\n도 허용)
  return markdown.replace(/^---\r?\n[\s\S]+?\r?\n---\r?\n?/, '').trim();
}

export type Platform = 'ghost' | 'landing' | 'both';

async function saveDrafts(
  draft: BlogDraft, topic: Topic,
  ghostThumbnailUrl: string, landingThumbnailUrl: string,
  platform: Platform = 'both'
): Promise<{ ghostId: string; landingId: string }> {
  const meta = extractFrontmatter(draft.ghostMarkdown);
  const focusKeyword = meta.focus_keyword || draft.focusKeyword;
  const description = meta.description || topic.rationale || draft.title;

  let ghostId = '';
  let landingId = '';

  if (platform === 'ghost' || platform === 'both') {
    const ghostHtml = await marked(stripFrontmatter(draft.ghostMarkdown));
    const result = await saveGhostDraft(draft.title, ghostHtml, draft.slug, meta.description || '', ghostThumbnailUrl);
    ghostId = result.id;
  }

  if (platform === 'landing' || platform === 'both') {
    const landingHtml = await marked(stripFrontmatter(draft.landingMarkdown));
    landingId = await saveLandingDraft(draft.title, landingHtml, draft.slug, topic, description, focusKeyword, landingThumbnailUrl);
  }

  return { ghostId, landingId };
}

async function attachThumbnailsAfter(
  draft: BlogDraft, ghostId: string, landingId: string,
  channel: string, threadTs: string, platform: Platform = 'both'
): Promise<void> {
  const tasks = await Promise.allSettled([
    (platform === 'ghost' || platform === 'both') ? generateGhostThumbnail(draft.title, draft.slug) : Promise.resolve(''),
    (platform === 'landing' || platform === 'both') ? generateLandingThumbnail(draft.title, draft.slug) : Promise.resolve(''),
  ]);

  const ghostThumbnailUrl = tasks[0].status === 'fulfilled' ? tasks[0].value : '';
  const landingThumbnailUrl = tasks[1].status === 'fulfilled' ? tasks[1].value : '';

  await Promise.allSettled([
    ghostThumbnailUrl ? updateGhostThumbnail(ghostId, ghostThumbnailUrl) : Promise.resolve(),
    landingThumbnailUrl ? updateLandingThumbnail(landingId, landingThumbnailUrl) : Promise.resolve(),
  ]);

  const lines: string[] = [];
  if (platform === 'ghost' || platform === 'both')
    lines.push(ghostThumbnailUrl ? `Ghost 썸네일: ${ghostThumbnailUrl}` : '⚠️ Ghost 썸네일 생성 실패');
  if (platform === 'landing' || platform === 'both')
    lines.push(landingThumbnailUrl ? `랜딩 썸네일: ${landingThumbnailUrl}` : '⚠️ 랜딩 썸네일 생성 실패');

  await postSlack(channel, `썸네일 생성 완료\n${lines.join('\n')}`, threadTs);
}

export async function handleBlogWrite(
  topic: Topic, channel: string, threadTs: string, platform: Platform = 'both'
): Promise<void> {
  const platformLabel = platform === 'ghost' ? 'Ghost' : platform === 'landing' ? '랜딩' : 'Ghost + 랜딩';
  await postSlack(channel,
    `블로그 작성을 시작합니다. (${platformLabel})\n\n제목: ${topic.title}\n\n골격 설계 → 산문 작성 순서로 진행합니다. 약 3~5분 소요됩니다.`,
    threadTs
  );

  let draft: BlogDraft;
  try {
    draft = await writeBlog(topic, platform);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await postSlack(channel, `⚠️ 블로그 초안 생성 실패: ${msg}`, threadTs);
    throw err;
  }

  const { ghostId, landingId } = await saveDrafts(draft, topic, '', '', platform);

  // 랜딩 포스팅 임베딩 저장 (장기 기억) — 실패해도 발행 차단 안 함
  const postId = landingId || ghostId;
  if (postId) {
    const meta = extractFrontmatter(draft.ghostMarkdown || draft.landingMarkdown);
    void savePostEmbedding({
      postId,
      title: draft.title,
      excerpt: meta.description || topic.rationale,
      description: meta.description,
      focusKeyword: draft.focusKeyword,
      singleClaim: topic.point,
    });
  }

  const excerptParts: string[] = [];
  if (platform === 'ghost' || platform === 'both') {
    const ghostExcerpt = stripFrontmatter(draft.ghostMarkdown)
      .replace(/#{1,6} .+/g, '').replace(/\n+/g, ' ').trim().slice(0, 200);
    excerptParts.push(`*Ghost 버전:*\n${ghostExcerpt}...`);
  }
  if (platform === 'landing' || platform === 'both') {
    const landingExcerpt = stripFrontmatter(draft.landingMarkdown)
      .replace(/#{1,6} .+/g, '').replace(/\n+/g, ' ').trim().slice(0, 200);
    excerptParts.push(`*랜딩 버전:*\n${landingExcerpt}...`);
  }

  // Qwen 검수 + 첨삭 (작성과 병렬)
  const baseMarkdown = draft.ghostMarkdown || draft.landingMarkdown;
  const reviewPromise = reviewBlogDraft(
    draft.title,
    baseMarkdown,
    draft.focusKeyword,
  ).catch(() => ({ content: '(검수 실패)', seo: '(검수 실패)', factCheck: '(검수 실패)' }));
  const advisePromise = adviseBlogDraft(draft.title, baseMarkdown)
    .catch(() => '(첨삭 실패)');

  const metaTag = `[blog-agent: ghost_id=${ghostId}|landing_id=${landingId}|title=${encodeURIComponent(draft.title)}]`;
  await postSlack(
    channel,
    `${metaTag}\n\n*[검토 요청] ${draft.title}*\n\n${excerptParts.join('\n\n')}\n\n> 썸네일 생성 중... 잠시 후 업데이트됩니다.\n> 발행하려면 이 스레드에 *발행할게요* 를 입력해주세요.`,
    threadTs
  );

  const [, review, advise] = await Promise.all([
    attachThumbnailsAfter(draft, ghostId, landingId, channel, threadTs, platform),
    reviewPromise,
    advisePromise,
  ]);

  await postSlack(
    channel,
    `📋 *Qwen 검수 결과*\n\n*내용 검수*\n${review.content}\n\n*SEO 검수*\n${review.seo}\n\n*팩트체크*\n${review.factCheck}`,
    threadTs,
  );

  await postSlack(
    channel,
    `🔍 *첨삭 에이전트 — 문서 개선 의견*\n\n${advise}`,
    threadTs,
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
  // BLOG_CHANNEL 최상위에 발행 — getTodayTopics()가 날짜 기반으로 파싱할 수 있도록
  await postSlack(BLOG_CHANNEL, message);
  // 다른 채널에서 요청한 경우에만 해당 스레드에도 회신 (BLOG_CHANNEL 내에서는 중복 방지)
  if (channel !== BLOG_CHANNEL) {
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

  const ghostOk = ghostResult.status === 'fulfilled';
  const landingOk = landingResult.status === 'fulfilled';
  const ghostUrl = ghostOk
    ? ghostResult.value
    : `⚠️ Ghost 발행 실패: ${(ghostResult as PromiseRejectedResult).reason?.message}`;
  const landingUrl = landingOk
    ? landingResult.value
    : `⚠️ 랜딩 발행 실패: ${(landingResult as PromiseRejectedResult).reason?.message}`;

  const status = ghostOk && landingOk ? '발행 완료!' : '부분 발행 — 아래 오류를 확인해주세요.';

  await postSlack(
    channel,
    `${status}\n*제목:* ${meta.title}\nGhost: ${ghostUrl}\n랜딩: ${landingUrl}`,
    threadTs
  );
}
