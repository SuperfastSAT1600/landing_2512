/**
 * 기존 posts 임베딩 백필 스크립트
 *
 * 사용법:
 *   node blog-agent/scripts/backfill-post-embeddings.js
 *   node blog-agent/scripts/backfill-post-embeddings.js --limit 10   # 10개만 처리
 *   node blog-agent/scripts/backfill-post-embeddings.js --dry-run    # DB 저장 없이 로그만
 *
 * 사전 조건:
 *   - supabase/migrations/125_posts_embedding.sql 이 적용되어 있어야 함
 *   - .env.local 에 OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정
 *
 * 임베딩 모델: OpenAI text-embedding-3-small (1536d)
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../');

// .env.local 파싱
function loadEnv() {
  const envPath = resolve(ROOT, '.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const match = line.match(/^([^#][^=]+)=(.+)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
  return env;
}

const env = loadEnv();

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 미설정');
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY 미설정');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.indexOf('--limit');
const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : null;

function buildPostEmbeddingText(post) {
  const parts = [];
  parts.push(`제목: ${post.title}`);
  if (post.focus_keyword) parts.push(`핵심 키워드: ${post.focus_keyword}`);
  if (post.description) parts.push(`설명: ${post.description}`);
  if (post.excerpt) parts.push(`발췌: ${post.excerpt}`);
  return parts.join('\n');
}

async function generateEmbedding(text) {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return res.data[0].embedding;
}

async function main() {
  console.log(`[backfill] 시작 (dry-run: ${isDryRun}, limit: ${limit ?? 'all'})`);

  // embedding이 없는 published 포스팅 조회
  let query = supabase
    .from('posts')
    .select('id, title, excerpt, description, focus_keyword')
    .eq('is_published', true)
    .is('embedding', null)
    .order('date', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data: posts, error } = await query;

  if (error) {
    if (error.message.includes('column') || error.message.includes('does not exist')) {
      console.error('[backfill] posts.embedding 컬럼이 없습니다.');
      console.error('supabase/migrations/125_posts_embedding.sql 을 먼저 적용해주세요.');
      process.exit(1);
    }
    console.error('[backfill] posts 조회 실패:', error.message);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log('[backfill] 임베딩이 필요한 포스팅이 없습니다.');
    return;
  }

  console.log(`[backfill] ${posts.length}개 포스팅 임베딩 시작`);

  let success = 0;
  let failure = 0;

  for (const post of posts) {
    try {
      const text = buildPostEmbeddingText(post);
      const embedding = await generateEmbedding(text);

      if (!isDryRun) {
        const { error: updateError } = await supabase
          .from('posts')
          .update({ embedding })
          .eq('id', post.id);

        if (updateError) {
          console.error(`[backfill] ${post.id} 저장 실패:`, updateError.message);
          failure++;
          continue;
        }
      }

      console.log(`[backfill] ${isDryRun ? '(dry)' : ''} OK: ${post.id} — ${post.title}`);
      success++;

      // rate limit 회피 (OpenAI tier 1: 500 RPM)
      await new Promise((r) => setTimeout(r, 120));
    } catch (err) {
      console.error(`[backfill] ${post.id} 임베딩 생성 실패:`, err.message);
      failure++;
    }
  }

  console.log(`\n[backfill] 완료 — 성공: ${success}, 실패: ${failure}`);
}

main().catch((err) => {
  console.error('[backfill] fatal:', err);
  process.exit(1);
});
