/**
 * 포스팅 장기 기억 (Long-term Memory) + 관련 포스팅 RAG
 *
 * 발행된 포스팅의 임베딩을 Supabase posts.embedding에 저장하고,
 * 새 글 작성 전에 관련 과거 포스팅 상위 N개를 검색해 프롬프트에 주입한다.
 *
 * 사전 조건: supabase/migrations/126_posts_embedding_qwen.sql 이 적용되어 있어야 함.
 * 임베딩 모델: Qwen text-embedding-v3 (DashScope, 1024d)
 * 에러 발생 시 임베딩 실패가 발행 자체를 막지 않도록 try/catch로 보호.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

const EMBEDDING_DIMENSIONS = 1024;
const DASHSCOPE_EMBED_URL =
  'https://dashscope-intl.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding';
const BASE_URL = 'https://superfastsat.com/blog';

// ─── 임베딩 생성 ──────────────────────────────────────────────────────────────

async function generatePostEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY is not set');

  const res = await fetch(DASHSCOPE_EMBED_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-v3',
      input: { texts: [text.slice(0, 8000)] },
      parameters: { dimension: EMBEDDING_DIMENSIONS },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DashScope embedding failed: ${res.status} ${err}`);
  }

  const data = await res.json() as {
    output?: { embeddings?: { text_index: number; embedding: number[] }[] };
  };
  const embedding = data.output?.embeddings?.[0]?.embedding;
  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`embedding dimension mismatch: got ${embedding?.length} (expected ${EMBEDDING_DIMENSIONS})`);
  }
  return embedding;
}

// ─── 포스팅 임베딩 텍스트 빌드 ────────────────────────────────────────────────

export function buildPostEmbeddingText(post: {
  title: string;
  excerpt?: string | null;
  description?: string | null;
  focusKeyword?: string | null;
  singleClaim?: string | null;
}): string {
  const parts: string[] = [];
  parts.push(`제목: ${post.title}`);
  if (post.focusKeyword) parts.push(`핵심 키워드: ${post.focusKeyword}`);
  if (post.singleClaim) parts.push(`핵심 주장: ${post.singleClaim}`);
  if (post.description) parts.push(`설명: ${post.description}`);
  if (post.excerpt) parts.push(`발췌: ${post.excerpt}`);
  return parts.join('\n');
}

// ─── 1단계: 발행 후 임베딩 저장 ───────────────────────────────────────────────

export interface PostMemoryInput {
  /** Supabase posts.id (slug) */
  postId: string;
  title: string;
  excerpt?: string;
  description?: string;
  focusKeyword?: string;
  /** 골격(skeleton)의 single_claim — 임베딩 품질 향상 */
  singleClaim?: string;
}

/**
 * 발행된 포스팅의 임베딩을 Supabase posts.embedding에 저장한다.
 * 실패해도 throw하지 않음 — 호출부에서 try/catch 필요 없이 안전하게 사용 가능.
 */
export async function savePostEmbedding(input: PostMemoryInput): Promise<void> {
  try {
    const embeddingText = buildPostEmbeddingText(input);
    const embedding = await generatePostEmbedding(embeddingText);

    const { error } = await supabaseAdmin
      .from('posts')
      .update({ embedding })
      .eq('id', input.postId);

    if (error) {
      console.error('[post-memory] savePostEmbedding DB error:', error.message);
    } else {
      console.log(`[post-memory] embedding saved for post: ${input.postId}`);
    }
  } catch (err) {
    console.error('[post-memory] savePostEmbedding failed (non-fatal):', err instanceof Error ? err.message : err);
  }
}

// ─── 2단계: 관련 포스팅 검색 (RAG) ────────────────────────────────────────────

export interface RelatedPost {
  title: string;
  slug: string;
  excerpt: string;
  similarity?: number;
}

/**
 * 쿼리 텍스트와 유사한 과거 포스팅 상위 N개를 반환한다.
 * Supabase match_posts RPC를 사용. 실패 시 빈 배열 반환 (발행 차단 안 함).
 *
 * @param queryText 검색할 텍스트 (주제 제목 + 핵심 주장)
 * @param limit 최대 반환 개수 (기본: 3)
 * @param threshold 유사도 임계값 0~1 (기본: 0.65)
 */
export async function matchRelatedPosts(
  queryText: string,
  limit = 3,
  threshold = 0.65
): Promise<RelatedPost[]> {
  try {
    const embedding = await generatePostEmbedding(queryText);

    const { data, error } = await supabaseAdmin.rpc('match_posts', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      // embedding 컬럼/RPC가 아직 없으면 조용히 폴백
      if (
        error.message.includes('Could not find') ||
        error.message.includes('does not exist') ||
        error.message.includes('column') ||
        error.message.includes('function')
      ) {
        console.warn('[post-memory] match_posts RPC not available yet (migration pending)');
        return [];
      }
      console.error('[post-memory] matchRelatedPosts error:', error.message);
      return [];
    }

    if (!Array.isArray(data)) return [];

    return data.map((row: { id: string; title: string; excerpt?: string; description?: string; similarity: number }) => ({
      title: row.title,
      slug: row.id,
      excerpt: row.excerpt || row.description || '',
      similarity: row.similarity,
    }));
  } catch (err) {
    console.error('[post-memory] matchRelatedPosts failed (non-fatal):', err instanceof Error ? err.message : err);
    return [];
  }
}

// ─── 3단계: 프롬프트 컨텍스트 빌드 ────────────────────────────────────────────

/**
 * 관련 포스팅 목록을 프롬프트에 주입할 마크다운 블록으로 변환한다.
 * 포스팅이 없으면 빈 문자열 반환.
 */
export function buildRelatedPostsContext(posts: RelatedPost[]): string {
  if (!posts.length) return '';

  const lines = posts.map(
    (p) => `- [${p.title}](${BASE_URL}/${p.slug})${p.excerpt ? ` — ${p.excerpt.slice(0, 60).replace(/\n/g, ' ')}` : ''}`
  );

  return `\n## 관련 기존 포스팅 (내부 링크로 활용)\n${lines.join('\n')}\n`;
}
