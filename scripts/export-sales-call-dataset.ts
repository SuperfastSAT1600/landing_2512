/**
 * 세일즈 콜 전사를 IntelligentFunctions 코퍼스 Parquet으로 내보낸다 (REQ-007).
 *
 * 학생 1명 = 행 1개. 통화는 본문 안에서 헤더로 구분되고, 결과가 확정된 뒤의 통화는
 * 잘라내며(라벨 누출 방지), 전화번호·이름 등은 파일에 쓰이기 전에 가려진다.
 * 읽기·병합·쓰기는 CRM 라우트와 같은 `src/lib/intfunc/export-corpus.ts`를 쓴다.
 *
 * 이 스크립트가 만드는 파일은 미성년자·학부모 대화가 담긴 산출물이다. `out/`은
 * gitignore 대상이고, 업로드가 끝나면 지우는 것이 맞다.
 *
 * 실행:
 *   npx tsx scripts/export-sales-call-dataset.ts --dry-run
 *   npx tsx scripts/export-sales-call-dataset.ts --limit 50
 *   npx tsx scripts/export-sales-call-dataset.ts --out out/sales-calls.parquet
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { exportCorpus, writeCorpusParquet } from '../src/lib/intfunc/export-corpus';
import type { BuildStats } from '../src/lib/intfunc/corpus-row';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DEFAULT_OUT = 'out/sales-calls.parquet';

interface Options {
  dryRun: boolean;
  limit: number | null;
  out: string;
}

function parseArgs(argv: string[]): Options {
  const value = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const limitRaw = value('limit');
  return {
    dryRun: argv.includes('--dry-run'),
    limit: limitRaw ? Number(limitRaw) : null,
    out: value('out') || DEFAULT_OUT,
  };
}

function report(stats: BuildStats, options: Options): void {
  console.log(
    [
      ``,
      `대상 학생(결과 확정)     ${stats.students}`,
      `생성 행                  ${stats.rows}  (converted ${stats.converted} / lost ${stats.lost})`,
      `제외 — 라벨 없음         ${stats.excludedNoLabel}`,
      `제외 — 통화 없음/절단됨  ${stats.excludedNoCalls}`,
      `비식별 치환              ${stats.redactions}건`,
    ].join('\n')
  );
  if (stats.cutoffUnavailable > 0) {
    console.warn(
      `\n[경고] 절단 근거(stage_history·funnel_stage_updated_at)가 없는 학생 ${stats.cutoffUnavailable}명은\n` +
        `       결과 확정 이후 통화가 그대로 들어갔을 수 있다. 그 통화에는 결과가 등장하므로\n` +
        `       pack이 세일즈 신호 대신 결과 발화를 학습할 위험이 있다.`
    );
  }
  if (options.dryRun) console.log('\n--dry-run: 파일을 쓰지 않았다.');
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('students / call_transcripts 조회 중...');
  const { rows, stats } = await exportCorpus(db, options.limit);
  report(stats, options);

  if (options.dryRun) return;
  if (rows.length === 0) {
    console.log('내보낼 행이 없다.');
    return;
  }

  writeCorpusParquet(rows, options.out);

  // rows는 업로드 시 선언값으로 필요하다(SDK가 Parquet 푸터를 파싱하지 않는다).
  const meta = { rows: rows.length, stats, generatedAt: new Date().toISOString() };
  fs.writeFileSync(options.out.replace(/\.parquet$/, '.meta.json'), JSON.stringify(meta, null, 2));

  const bytes = fs.statSync(options.out).size;
  console.log(`\n${options.out} — ${rows.length}행 / ${(bytes / 1e6).toFixed(1)}MB`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
