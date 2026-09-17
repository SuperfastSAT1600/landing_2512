/**
 * 2025년 구 진단테스트 응시 기록 회수 — READ ONLY (외부 소스만 읽는다).
 *
 * 소스 1: Firebase RTDB  https://sfs-diagnostictest-default-rtdb.firebaseio.com
 *         → /diagnostic_results (주 저장소), /students (초기 saveStudent.js 흔적)
 *         비활성 상태면 HTTP 423 이 온다. 이때 죽지 않고 소스 2만으로 진행한다.
 * 소스 2: GitHub SuperfastSAT1600/MJ-sat-diagnostic-test 의 database.json (Firebase 이전 53건)
 *         저장소를 2026-09-17 에 private 으로 돌렸으므로 raw URL 은 404 다.
 *         gh CLI(인증됨) → 이전 실행이 남긴 캐시 순으로 폴백한다.
 *
 * Usage:
 *   npx tsx scripts/export-legacy-diagnostic.ts
 *   npx tsx scripts/export-legacy-diagnostic.ts --legacy-json ./database.json
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import {
  normalizeFirebaseNode,
  normalizeLegacyJson,
  mergeAttempts,
  type NormalizedAttempt,
} from '../src/lib/legacy-diagnostic-normalize';

const RTDB = 'https://sfs-diagnostictest-default-rtdb.firebaseio.com';
const RAW_DB_JSON =
  'https://raw.githubusercontent.com/SuperfastSAT1600/MJ-sat-diagnostic-test/master/database.json';
const OUT_DIR = 'scripts/out/legacy-diagnostic';
const CACHED_DB_JSON = `${OUT_DIR}/raw-database.json`;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function fetchNode(node: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${RTDB}/${node}.json`);
  const text = await res.text();
  if (!res.ok) {
    console.warn(`  ! ${node}: HTTP ${res.status} — ${text.slice(0, 120).replace(/\s+/g, ' ')}`);
    if (res.status === 423) {
      console.warn('    RTDB가 비활성 상태다. Firebase 콘솔에서 인스턴스를 재활성화한 뒤 다시 실행할 것.');
    }
    return null;
  }
  const parsed = JSON.parse(text);
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
}

async function loadLegacyJson(): Promise<unknown[]> {
  const local = arg('--legacy-json');
  if (local) {
    if (!existsSync(local)) throw new Error(`--legacy-json 파일 없음: ${local}`);
    return JSON.parse(readFileSync(local, 'utf-8'));
  }

  const res = await fetch(RAW_DB_JSON);
  if (res.ok) return res.json();
  console.warn(`  ! raw URL HTTP ${res.status} — 저장소가 private 이다. gh CLI 로 시도한다.`);

  try {
    const out = execFileSync(
      'gh',
      ['api', 'repos/SuperfastSAT1600/MJ-sat-diagnostic-test/contents/database.json', '--jq', '.content'],
      { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 }
    );
    return JSON.parse(Buffer.from(out.replace(/\s/g, ''), 'base64').toString('utf-8'));
  } catch {
    console.warn('  ! gh CLI 조회 실패 — 직전 실행이 남긴 캐시를 쓴다.');
  }

  if (existsSync(CACHED_DB_JSON)) return JSON.parse(readFileSync(CACHED_DB_JSON, 'utf-8'));
  console.warn('  ! database.json 을 어느 경로로도 못 읽었다 (--legacy-json 으로 로컬 파일 지정 가능)');
  return [];
}

function summarize(attempts: NormalizedAttempt[]) {
  const real = attempts.filter((a) => !a.is_internal);
  const dates = attempts.map((a) => a.taken_at).filter((d): d is string => !!d).sort();
  return {
    total: attempts.length,
    real: real.length,
    internal: attempts.length - real.length,
    firstTakenAt: dates[0] ?? null,
    lastTakenAt: dates[dates.length - 1] ?? null,
  };
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  console.log('1) Firebase RTDB 조회');
  const [results, studentsNode] = await Promise.all([fetchNode('diagnostic_results'), fetchNode('students')]);
  writeFileSync(`${OUT_DIR}/raw-diagnostic_results.json`, JSON.stringify(results ?? null, null, 2));
  writeFileSync(`${OUT_DIR}/raw-students.json`, JSON.stringify(studentsNode ?? null, null, 2));
  console.log(`   diagnostic_results: ${results ? Object.keys(results).length : '읽기 실패'}건`);
  console.log(`   students: ${studentsNode ? Object.keys(studentsNode).length : '읽기 실패'}건`);

  console.log('2) database.json 조회');
  const legacyRows = await loadLegacyJson();
  writeFileSync(`${OUT_DIR}/raw-database.json`, JSON.stringify(legacyRows, null, 2));
  console.log(`   database.json: ${legacyRows.length}건`);

  const fb = normalizeFirebaseNode(results as never);
  const json = normalizeLegacyJson(legacyRows as never);
  const { attempts, droppedDuplicates } = mergeAttempts(fb, json);

  writeFileSync(`${OUT_DIR}/normalized.json`, JSON.stringify(attempts, null, 2));

  const s = summarize(attempts);
  console.log('\n3) 정규화 결과');
  console.log(`   합계 ${s.total}건 (Firebase ${fb.length} + database.json ${json.length} - 중복 ${droppedDuplicates})`);
  console.log(`   실제 응시 ${s.real}건 / 내부 테스트 ${s.internal}건`);
  console.log(`   기간 ${s.firstTakenAt?.slice(0, 10) ?? '-'} ~ ${s.lastTakenAt?.slice(0, 10) ?? '-'}`);
  console.log(`   → ${OUT_DIR}/normalized.json`);

  if (!results) {
    console.log('\n   ⚠ Firebase를 읽지 못해 database.json 분량만 담겼다. 재활성화 후 다시 실행할 것.');
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
