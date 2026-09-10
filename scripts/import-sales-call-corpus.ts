/**
 * 세일즈 콜 전사를 IntelligentFunctions internal dataset으로 보낸다 (REQ-207).
 *
 * 학생 1명 = 행 1개. 통화는 본문 안에서 헤더로 구분되고, 결과가 확정된 뒤의 통화는
 * 잘라내며(라벨 누출 방지), 전화번호·이름 등은 전송 전에 가려진다. 읽기·병합은 CRM
 * 라우트와 같은 `src/lib/intfunc/export-corpus.ts`를 쓴다.
 *
 * 전송된 행은 intfunc이 보관한다. 되돌리려면 출력되는 import id로
 * `client.rollbackImport(id)`를 부른다. pack 학습은 콘솔에서 이 데이터셋을 대상으로 돈다.
 *
 * 실행:
 *   npx tsx scripts/import-sales-call-corpus.ts --dry-run
 *   npx tsx scripts/import-sales-call-corpus.ts --limit 50
 *   npx tsx scripts/import-sales-call-corpus.ts --out out/sales-calls.jsonl   # 전송 대신 덤프
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { exportCorpus } from '../src/lib/intfunc/export-corpus';
import type { BuildStats } from '../src/lib/intfunc/corpus-row';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface Options {
  dryRun: boolean;
  limit: number | null;
  /** 있으면 전송하지 않고 이 파일에 JSONL로 쓴다 — 원문이 담긴 파일은 요청해야만 생긴다. */
  out: string | null;
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
    out: value('out') ?? null,
  };
}

function report(stats: BuildStats): void {
  console.log(
    [
      ``,
      `대상 학생(결과 확정)     ${stats.students}`,
      `생성 행                  ${stats.rows}  (converted ${stats.converted} / lost ${stats.lost})`,
      ``,
      `제외 — 라벨 없음         ${stats.excludedNoLabel}명`,
      `제외 — 전사 없음         ${stats.excludedNoTranscript}명`,
      `제외 — 세일즈 콜 아님    ${stats.excludedAllFiltered}명`,
      `제외 — 결과 확정 이후    ${stats.excludedAllTruncated}명`,
      ``,
      `통화 전체                ${stats.callsTotal}건`,
      `  전송에 들어간 통화     ${stats.callsKept}건`,
      `  중복 제거              ${stats.duplicateCalls}건`,
      `  유형 제외              ${stats.callsFiltered}건` +
        ` (재결제 ${stats.callsByKind.renewal} / 이탈 ${stats.callsByKind.winback}` +
        ` / 운영 ${stats.callsByKind.ops})`,
      `  절단                   ${stats.callsTruncated}건`,
      `  세일즈 / 미분류        ${stats.callsByKind.new_sales} / ${stats.callsByKind.unknown}건`,
      ``,
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
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('students / call_transcripts 조회 중...');
  const { rows, stats } = await exportCorpus(db, options.limit);
  report(stats);

  if (options.dryRun) {
    console.log('\n--dry-run: 아무것도 전송하지 않았다.');
    return;
  }
  if (rows.length === 0) {
    console.log('보낼 행이 없다.');
    return;
  }

  const { intfuncClient, datasetKey } = await import('../src/lib/intfunc/client');
  const { ensureDataset, importCorpus, toExample } = await import(
    '../src/lib/intfunc/import-corpus'
  );

  if (options.out) {
    // 로컬 검사용. 상담 원문이 담긴 파일이므로 out/은 gitignore 대상이고, 보고 나면 지운다.
    fs.mkdirSync(path.dirname(options.out), { recursive: true });
    fs.writeFileSync(options.out, rows.map((r) => JSON.stringify(toExample(r))).join('\n'));
    console.log(`\n${options.out} — ${rows.length}행 (전송하지 않았다)`);
    return;
  }

  const client = intfuncClient();
  await ensureDataset(client);
  console.log(`\n${datasetKey()}로 ${rows.length}행 전송 중...`);
  const summary = await importCorpus(client, rows);

  console.log(
    `\n받음 ${summary.received} / 저장 ${summary.imported} / 건너뜀 ${summary.skipped}` +
      (summary.errors.length ? ` / 실패 ${summary.errors.length}` : '')
  );
  if (summary.errors.length) {
    const codes = [...new Set(summary.errors.map((e) => e.code ?? 'unknown'))];
    console.warn(`실패 코드: ${codes.join(', ')}`);
  }
  console.log(`import id: ${summary.importIds.join(', ')}  (되돌리려면 rollbackImport)`);
  console.log('pack 학습은 IF 콘솔에서 이 데이터셋으로 진행할 것.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
