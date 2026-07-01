import { marked } from 'marked';
import type { Topic } from './blog-writer';
import { writeBlog } from './blog-writer';
import { saveGhostDraft, publishGhostPost, titleToSlug } from './ghost-client';
import { saveLandingDraft, publishLandingPost } from './landing-client';
import { postSlack, getDraftFromThread } from './slack-utils';

export async function handleBlogWrite(
  topic: Topic, channel: string, threadTs: string
): Promise<void> {
  await postSlack(channel,
    `블로그 작성을 시작합니다.\n\n제목: ${topic.title}\n\n골격 설계 후 산문 작성까지 약 2~3분 소요됩니다.`,
    threadTs
  );

  const markdown = await writeBlog(topic);
  const html = await marked(markdown);
  const slug = titleToSlug(topic.title);

  const [ghostResult, landingResult] = await Promise.allSettled([
    saveGhostDraft(topic.title, html, slug),
    saveLandingDraft(topic.title, html, slug, topic),
  ]);

  if (ghostResult.status === 'rejected') {
    await postSlack(channel, `Ghost 저장 실패: ${ghostResult.reason?.message}`, threadTs);
    return;
  }
  if (landingResult.status === 'rejected') {
    await postSlack(channel, `랜딩 저장 실패: ${landingResult.reason?.message}`, threadTs);
    return;
  }

  const { id: ghostId } = ghostResult.value;
  const landingId = landingResult.value;
  const excerpt = markdown.replace(/#{1,3} .+\n/g, '').replace(/\n+/g, ' ').trim().slice(0, 200);
  const meta = `[blog-agent: ghost_id=${ghostId}|landing_id=${landingId}|title=${encodeURIComponent(topic.title)}]`;

  await postSlack(
    channel,
    `${meta}\n\n*블로그 초안 완성 — 확인해주세요*\n\n*제목:* ${topic.title}\n\n*요약:*\n${excerpt}...\n\n> 발행하려면 이 스레드에서 *@landingpage 발행할게요* 라고 입력해주세요.`,
    threadTs
  );
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
