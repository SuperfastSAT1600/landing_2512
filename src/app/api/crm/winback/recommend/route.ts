import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getQwenAnthropicClient, isQwenConfigured } from '@/lib/qwen';
import { generateEmbedding } from '@/lib/embedding';
import type { WinbackCandidate, WinbackRecommendStats, WinbackRuleFilters } from '@/types/crm';
import { parseBrief, buildBriefQueryText, type BriefInput } from '@/lib/winback/brief';
import { loadCandidatePool } from '@/lib/winback/candidates';
import { scoreWinbackCandidate, type WinbackScoreStudent } from '@/lib/winback/score';
import { buildCandidateProfile } from '@/lib/winback/profile';
import { parseRecommendResponse, type WinbackPick } from '@/lib/winback/parse';
import {
  buildRankedCandidates,
  mergeChunkPicks,
  splitIntoChunks,
} from '@/lib/winback/rank';
import { churnedDaysOf } from '@/lib/winback/recency';

// 후보 조회 + 임베딩 + LLM 재랭킹을 한 요청에서 처리한다.
export const maxDuration = 60;

const DEFAULT_LIMIT = 50;
const RERANK_POOL = 45; // AI 심사 정원. 묶음을 병렬 호출하므로 정원을 늘려도 지연은 거의 그대로다.
/**
 * 재랭킹 묶음 크기. 정원 전체를 한 번에 넘기면 모델이 후보 절반을 응답에서 누락한다
 * (실측 2026-08-19: 45명 중 26명만 판정). 13명씩 쪼개 병렬 호출한다.
 */
const RERANK_CHUNK = 13;
/**
 * 재랭킹 모델 — `fast`(qwen-turbo)는 "후보 전원 판정" 지시를 자주 무시한다(실측).
 * 중간 티어를 별도 env로 뽑아 쓴다. 다른 CRM 호출부의 티어와는 독립.
 */
const RERANK_MODEL = process.env.WINBACK_RERANK_MODEL?.trim() || 'qwen-plus';
// 후보 전원 대신 상위 N명만 유사도를 받으므로, 이 값이 작으면 상위 슬라이스가 그 N명에 종속된다.
// 60이던 시절 1,200명 중 60명만 유사도 가점(최대 +25)을 받아 랭킹이 사실상 그들만의 경쟁이 됐다.
const VECTOR_MATCH_COUNT = 200;
const COOLDOWN_FALLBACK_DAYS = 30;

const SYSTEM_PROMPT = `너는 이탈 리드에게 특정 상품을 파는 "윈백 플레이"의 타겟 심사관이다.
상품 브리프와 후보 프로필을 보고, 이 상품을 지금 제안했을 때 실제로 반응·결제할 가능성을 판정한다.

규칙:
- 판정 근거는 반드시 프로필의 구체 사실(상담 메모 문구, 이탈 사유, 목표 시험 시기, 학년, 캠페인 태그)에서 가져온다.
- 프로필에 없는 사실을 만들어내지 마라. 근거가 약하면 fit을 낮게 주면 된다.
- fit은 **제안 우선순위**다. 5=지금 바로, 4=좋음, 3=제안 가능, 2=약함, 1=부적합.
- fit이 낮아도 후보는 담당자에게 그대로 노출된다. 즉 fit은 후보를 **탈락시키는 값이 아니다** —
  낮게 주는 것을 아껴야 할 이유도, 판정을 생략할 이유도 없다.
- **후보를 서로 비교해 순서를 만들어라.** 근거가 뚜렷한 소수에 5~4, 판단이 어려운 다수에 3,
  프로필에 단서가 거의 없는 후보에 2를 준다.
  (실측 참고: 이 모델은 배분 쿼터를 강제하면 전원을 한 값으로 옮길 뿐 변별하지 못한다.
   그래서 fit은 거친 게이트가 아니라 약한 가점으로만 쓰고, 순위 대부분은 규칙 점수·유사도가 만든다.)
- reason은 한국어 한 문장, **50자 이내**로 짧게. 무엇을 근거로 골랐는지 구체적으로 쓴다.
  모든 후보에 공통인 사실(예: 같은 시험일)만 근거로 쓰지 말고, 그 리드만의 사실을 인용하라.
- 과목 의도의 근거는 상담 메모 > 목표 시험일·학제 > 캠페인 태그 순으로 본다.
  캠페인 태그는 대부분 유입 경로('META 리드' 등)라서 과목 의도의 근거가 되지 못한다.
- 후보 전원을 판정하라. 한 명도 빼지 마라.

설명·머리말 없이 아래 JSON만 출력하라:
{"picks":[{"id":"<uuid>","fit":4,"reason":"50자 이내 근거"}]}`;

interface RecommendBody {
  brief?: BriefInput;
  rules?: WinbackRuleFilters;
  limit?: number;
  play_id?: string | null;
  cooldown_days?: number;
}

function lastMemoOf(row: Record<string, unknown>): string | null {
  const timeline = (row.consultation_timeline ?? []) as Array<{
    raw_memo?: string;
    ai_purified?: string;
    created_at?: string;
  }>;
  if (timeline.length === 0) return null;
  const latest = [...timeline].sort((a, b) => ((a.created_at ?? '') < (b.created_at ?? '') ? 1 : -1))[0];
  return (latest.ai_purified ?? latest.raw_memo ?? '').replace(/\s+/g, ' ').slice(0, 120) || null;
}

/** 후보 id 집합 안에서만 벡터 유사도를 구한다(마이그레이션 108). */
async function similarityMap(
  queryText: string,
  candidateIds: string[]
): Promise<{ map: Map<string, number>; error?: string }> {
  try {
    const embedding = await generateEmbedding(queryText);
    const { data, error } = await supabaseAdmin.rpc('match_students_in_pool', {
      query_embedding: JSON.stringify(embedding),
      candidate_ids: candidateIds,
      match_count: VECTOR_MATCH_COUNT,
    });
    if (error) return { map: new Map(), error: `벡터 검색 실패: ${error.message}` };

    const map = new Map<string, number>();
    for (const r of (data ?? []) as Array<{ id: string; similarity: number }>) {
      map.set(r.id, r.similarity);
    }
    return { map };
  } catch (err) {
    return { map: new Map(), error: `임베딩 실패: ${(err as Error).message}` };
  }
}

/** 묶음 하나를 판정. 실패는 throw하지 않고 이유를 돌려 그 묶음만 degrade한다. */
async function rerankChunk(
  brief: string,
  profiles: string,
  validIds: Set<string>
): Promise<{ picks: WinbackPick[]; error?: string }> {
  let rawText = '';
  try {
    const client = getQwenAnthropicClient();
    const message = await client.messages.create({
      model: RERANK_MODEL,
      max_tokens: 4096, // 묶음 13명 판정 출력에 충분한 여유
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content:
            `[상품 브리프]\n${brief}\n\n` +
            `[후보 프로필 — 총 ${validIds.size}명, 전원 판정 필수]\n\n${profiles}`,
        },
      ],
    });
    const block = message.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') throw new Error('예상치 못한 AI 응답 형식');
    rawText = block.text;
    return { picks: parseRecommendResponse(rawText, validIds).picks };
  } catch (err) {
    // 응답 앞부분을 함께 남긴다 — 파싱 실패 원인(잘림/잡담/형식)을 로그로 판별할 수 있게.
    console.error('[winback/recommend] rerank chunk failed', err, '| raw head:', rawText.slice(0, 300));
    return { picks: [], error: `AI 재랭킹 실패: ${(err as Error).message}` };
  }
}

/** 상위 후보를 묶음 단위로 병렬 재랭킹. */
async function rerank(
  brief: string,
  chunks: Array<{ profiles: string; ids: Set<string> }>
): Promise<{ picks: WinbackPick[]; error?: string }> {
  if (!isQwenConfigured()) return { picks: [], error: 'AI가 설정되지 않아 규칙 점수만 사용했습니다.' };
  return mergeChunkPicks(await Promise.all(chunks.map((c) => rerankChunk(brief, c.profiles, c.ids))));
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  let body: RecommendBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const briefText = body.brief?.brief?.trim();
  if (!briefText) {
    return NextResponse.json({ error: '상품 브리프를 입력해주세요.' }, { status: 400 });
  }

  const now = Date.now();
  const parsed = parseBrief({ ...body.brief!, brief: briefText });
  const limit = Math.min(Math.max(body.limit ?? DEFAULT_LIMIT, 1), 100);

  let pool;
  try {
    pool = await loadCandidatePool(body.rules ?? {}, {
      now,
      cooldownDays: body.cooldown_days ?? COOLDOWN_FALLBACK_DAYS,
      playId: body.play_id ?? null,
    });
  } catch (err) {
    console.error('[winback/recommend] candidate load failed', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  if (pool.rows.length === 0) {
    const stats: WinbackRecommendStats = {
      prefiltered: 0,
      reranked: 0,
      embedded: 0,
      llm_used: false,
      embedding_used: false,
      degraded_reason: '조건에 맞는 이탈 리드가 없습니다. 필터를 넓혀보세요.',
    };
    return NextResponse.json({ data: { candidates: [], stats } });
  }

  const sim = await similarityMap(
    buildBriefQueryText(briefText, parsed),
    pool.rows.map((r) => r.id)
  );

  // 규칙 점수 + 유사도 → 정렬
  const scored = pool.rows
    .map((row) => {
      const student = {
        ...(row as unknown as WinbackScoreStudent),
        paid_categories: pool.paidCategories.get(row.id) ?? [],
      };
      const result = scoreWinbackCandidate(student, parsed, {
        similarity: sim.map.get(row.id) ?? null,
        now,
      });
      return { id: row.id, row, student, ...result, similarity: sim.map.get(row.id) ?? null };
    })
    // 표시 점수는 100에서 잘리므로 정렬은 원점수로, 동점은 유사도 → 이름으로 가린다.
    .sort(
      (a, b) =>
        b.raw_score - a.raw_score ||
        (b.similarity ?? 0) - (a.similarity ?? 0) ||
        a.row.name.localeCompare(b.row.name)
    );

  const rerankPool = scored.slice(0, RERANK_POOL);
  const profileOf = (c: (typeof rerankPool)[number]) =>
    buildCandidateProfile(
      { ...c.student, ...(c.row as object) } as Parameters<typeof buildCandidateProfile>[0],
      {
        rule_score: c.rule_score,
        similarity: c.similarity,
        signals: c.signals,
        churnedDays: churnedDaysOf(c.student, now),
      }
    );

  const chunks = splitIntoChunks(rerankPool, RERANK_CHUNK).map((slice) => ({
    profiles: slice.map(profileOf).join('\n\n---\n\n'),
    ids: new Set(slice.map((c) => c.id)),
  }));

  const { picks, error: llmError } = await rerank(briefText, chunks);
  const pickMap = new Map(picks.map((p) => [p.id, p]));

  // 후보 전원을 대상으로 랭킹을 조립한다 — LLM 판정은 순위·근거만 담당하고 후보를 떨어뜨리지 않는다.
  // 정원(RERANK_POOL) 밖 후보도 규칙 점수로 backfill되므로 AI 상태와 무관하게 limit만큼 노출된다.
  const ranked = buildRankedCandidates(scored, pickMap, limit);

  const candidates: WinbackCandidate[] = ranked.map((c, i) => ({
    student_id: c.row.id,
    name: c.row.name,
    grade: (c.row.grade as string) ?? '',
    churn_tag: (c.row.churn_tag as string | null) ?? null,
    rank: i + 1,
    score: c.final,
    rule_score: c.rule_score,
    similarity: c.similarity,
    llm_fit: c.llm_fit,
    reason: c.reason,
    signals: c.signals,
    last_memo: lastMemoOf(c.row),
  }));

  const stats: WinbackRecommendStats = {
    prefiltered: pool.prefilteredCount,
    reranked: rerankPool.length,
    judged: picks.length,
    embedded: sim.map.size,
    llm_used: picks.length > 0,
    embedding_used: sim.map.size > 0,
    ...(sim.error || llmError ? { degraded_reason: [sim.error, llmError].filter(Boolean).join(' / ') } : {}),
  };

  return NextResponse.json({ data: { candidates, stats } });
}
