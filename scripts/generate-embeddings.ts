/**
 * 학생 프로필 임베딩 백필 — Qwen text-embedding-v4.
 *
 * 공급자를 바꾸면 벡터 공간이 달라져 기존 벡터와 유사도 비교가 무의미하다.
 * 그래서 기본 동작은 **전량 재임베딩**이다(`--only-missing`으로 누락분만 채울 수 있음).
 *
 * 실행:
 *   npx tsx scripts/generate-embeddings.ts --dry-run
 *   npx tsx scripts/generate-embeddings.ts --limit 10
 *   npx tsx scripts/generate-embeddings.ts                 # 전체(모든 lead_status) 재임베딩
 *   npx tsx scripts/generate-embeddings.ts --scope pool     # 이탈풀(inactive/reactivating)만
 *   npx tsx scripts/generate-embeddings.ts --only-missing    # embedding IS NULL 인 학생만
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { generateEmbedding, buildEmbeddingText } from '../src/lib/embedding';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const POOL_STATUSES = ['inactive', 'reactivating'];
const FETCH_PAGE = 500; // Supabase 1000행 캡 회피
const COLUMNS =
  'id, name, grade, school_type, desired_subjects, campaign_tags, previous_rw_score, previous_math_score, ' +
  'target_score, target_test_date, churn_type, churn_tag, inquiry_channel, traffic_source, b2b_partner, ' +
  'lead_status, consultation_timeline, reactivation_log';

interface Options {
  scope: 'pool' | 'all';
  limit: number | null;
  onlyMissing: boolean;
  dryRun: boolean;
  concurrency: number;
}

function parseArgs(argv: string[]): Options {
  const flag = (name: string) => argv.includes(`--${name}`);
  const value = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const scope = value('scope') === 'pool' ? 'pool' : 'all';
  const limitRaw = value('limit');
  return {
    scope,
    limit: limitRaw ? Number(limitRaw) : null,
    onlyMissing: flag('only-missing'),
    dryRun: flag('dry-run'),
    concurrency: Number(value('concurrency') ?? 4),
  };
}

type Row = Record<string, unknown> & { id: string; name: string };

/** 대상 학생을 페이지 단위로 모두 읽는다(범위 조회로 1000행 캡 회피). */
async function fetchTargets(opts: Options): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += FETCH_PAGE) {
    let query = supabase.from('students').select(COLUMNS).order('id');
    if (opts.scope === 'pool') query = query.in('lead_status', POOL_STATUSES);
    if (opts.onlyMissing) query = query.is('embedding', null);

    const { data, error } = await query.range(from, from + FETCH_PAGE - 1);
    if (error) throw new Error(`fetch failed: ${error.message}`);
    if (!data?.length) break;

    rows.push(...(data as unknown as Row[]));
    if (opts.limit && rows.length >= opts.limit) return rows.slice(0, opts.limit);
    if (data.length < FETCH_PAGE) break;
  }
  return rows;
}

/** 한 학생을 임베딩해 저장한다. 실패는 호출부가 집계하도록 throw. */
async function embedOne(row: Row, dryRun: boolean): Promise<void> {
  const text = buildEmbeddingText(row as Parameters<typeof buildEmbeddingText>[0]);
  const embedding = await generateEmbedding(text);
  if (dryRun) return;

  const { error } = await supabase
    .from('students')
    .update({ embedding: JSON.stringify(embedding) })
    .eq('id', row.id);
  if (error) throw new Error(error.message);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const targets = await fetchTargets(opts);

  console.log(
    `대상 ${targets.length}명 (scope=${opts.scope}, onlyMissing=${opts.onlyMissing}, ` +
      `limit=${opts.limit ?? '-'}, dryRun=${opts.dryRun}, concurrency=${opts.concurrency})`
  );

  let done = 0;
  const failures: Array<{ id: string; name: string; error: string }> = [];

  // 고정 크기 워커 풀 — 인덱스를 공유해 순서대로 소비한다.
  let next = 0;
  const worker = async () => {
    while (next < targets.length) {
      const row = targets[next++];
      try {
        await embedOne(row, opts.dryRun);
      } catch (err) {
        failures.push({ id: row.id, name: row.name, error: (err as Error).message });
      }
      done++;
      if (done % 50 === 0 || done === targets.length) {
        console.log(`  진행 ${done}/${targets.length} (실패 ${failures.length})`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, worker));

  console.log(`\n완료: 성공 ${done - failures.length}건 / 실패 ${failures.length}건`);
  for (const f of failures.slice(0, 20)) {
    console.error(`  실패 ${f.name}(${f.id}): ${f.error}`);
  }
  if (failures.length > 20) console.error(`  ... 외 ${failures.length - 20}건`);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
