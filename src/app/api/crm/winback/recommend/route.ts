import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getQwenAnthropicClient, qwenModel, isQwenConfigured } from '@/lib/qwen';
import { generateEmbedding } from '@/lib/embedding';
import type { WinbackCandidate, WinbackRecommendStats, WinbackRuleFilters } from '@/types/crm';
import { parseBrief, buildBriefQueryText, type BriefInput } from '@/lib/winback/brief';
import { loadCandidatePool } from '@/lib/winback/candidates';
import { scoreWinbackCandidate, type WinbackScoreStudent } from '@/lib/winback/score';
import { buildCandidateProfile } from '@/lib/winback/profile';
import { parseRecommendResponse, type WinbackPick } from '@/lib/winback/parse';

// 후보 조회 + 임베딩 + LLM 재랭킹을 한 요청에서 처리한다.
export const maxDuration = 60;

const DEFAULT_LIMIT = 30;
const RERANK_POOL = 25; // 상담 메모를 넣기 때문에 프롬프트 상한상 25명이 안전선
const VECTOR_MATCH_COUNT = 60;
const COOLDOWN_FALLBACK_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const SYSTEM_PROMPT = `너는 이탈 리드에게 특정 상품을 파는 "윈백 플레이"의 타겟 심사관이다.
상품 브리프와 후보 프로필을 보고, 이 상품을 지금 제안했을 때 실제로 반응·결제할 가능성을 판정한다.

규칙:
- 판정 근거는 반드시 프로필의 구체 사실(상담 메모 문구, 이탈 사유, 목표 시험 시기, 학년, 캠페인 태그)에서 가져온다.
- 프로필에 없는 사실을 만들어내지 마라. 근거가 약하면 fit을 낮게 주고 excluded에 넣어라.
- fit: 5=지금 바로 제안 가치 높음, 4=좋음, 3=제안 가능, 2=약함, 1=부적합.
- **후보를 서로 비교해 반드시 변별하라.** 전원에게 같은 fit을 주지 마라.
  5는 최대 3명, 4는 최대 5명까지만 주고, 근거가 약한 후보는 2 이하로 낮춰라.
- reason은 한국어 한 문장, **50자 이내**로 짧게. 무엇을 근거로 골랐는지 구체적으로 쓴다.
  모든 후보에 공통인 사실(예: 같은 시험일)만 근거로 쓰지 말고, 그 리드만의 사실을 인용하라.
- 상담 메모에 과목 의도가 명확히 없다면 캠페인 태그를 우선 신뢰하라.
- 후보 전원을 판정하라. 부적합은 fit을 1~2로 주면 된다(별도 목록은 만들지 마라).

설명·머리말 없이 아래 JSON만 출력하라:
{"picks":[{"id":"<uuid>","fit":4,"reason":"50자 이내 근거"}]}`;

interface RecommendBody {
  brief?: BriefInput;
  rules?: WinbackRuleFilters;
  limit?: number;
  play_id?: string | null;
  cooldown_days?: number;
}

/** 규칙 신호에서 사람이 읽을 근거 한 줄을 만든다(LLM degrade 시 사용). */
function reasonFromSignals(signals: { label: string; delta: number }[]): string {
  const positives = signals.filter((s) => s.delta > 0).slice(0, 3).map((s) => s.label);
  return positives.length > 0 ? `규칙 신호: ${positives.join(' · ')}` : '규칙 점수 기준 상위 후보';
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

/** 상위 후보를 Qwen으로 재랭킹. 실패는 throw하지 않고 이유를 돌려 degrade한다. */
async function rerank(
  brief: string,
  profiles: string,
  validIds: Set<string>
): Promise<{ picks: WinbackPick[]; error?: string }> {
  if (!isQwenConfigured()) return { picks: [], error: 'AI가 설정되지 않아 규칙 점수만 사용했습니다.' };

  let rawText = '';
  try {
    const client = getQwenAnthropicClient();
    const message = await client.messages.create({
      model: qwenModel('fast'),
      max_tokens: 4096, // 후보 20명 판정 출력이 잘리지 않을 여유
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `[상품 브리프]\n${brief}\n\n[후보 프로필]\n\n${profiles}` }],
    });
    const block = message.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') throw new Error('예상치 못한 AI 응답 형식');
    rawText = block.text;
    return { picks: parseRecommendResponse(rawText, validIds).picks };
  } catch (err) {
    // 응답 앞부분을 함께 남긴다 — 파싱 실패 원인(잘림/잡담/형식)을 로그로 판별할 수 있게.
    console.error('[winback/recommend] rerank failed', err, '| raw head:', rawText.slice(0, 300));
    return { picks: [], error: `AI 재랭킹 실패(규칙 점수만 사용): ${(err as Error).message}` };
  }
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
      return { row, student, ...result, similarity: sim.map.get(row.id) ?? null };
    })
    // 표시 점수는 100에서 잘리므로 정렬은 원점수로, 동점은 유사도 → 이름으로 가린다.
    .sort(
      (a, b) =>
        b.raw_score - a.raw_score ||
        (b.similarity ?? 0) - (a.similarity ?? 0) ||
        a.row.name.localeCompare(b.row.name)
    );

  const rerankPool = scored.slice(0, RERANK_POOL);
  const profiles = rerankPool
    .map((c) =>
      buildCandidateProfile(
        { ...c.student, ...(c.row as object) } as Parameters<typeof buildCandidateProfile>[0],
        {
          rule_score: c.rule_score,
          similarity: c.similarity,
          signals: c.signals,
          churnedDays: (now - new Date(c.row.updated_at).getTime()) / DAY_MS,
        }
      )
    )
    .join('\n\n---\n\n');

  const { picks, error: llmError } = await rerank(
    briefText,
    profiles,
    new Set(rerankPool.map((c) => c.row.id))
  );
  const pickMap = new Map(picks.map((p) => [p.id, p]));

  // LLM이 살아 있으면 fit을 섞어 재정렬하고 부적합(fit<3)은 떨어뜨린다. 죽으면 규칙 점수 순.
  const ranked = (
    picks.length > 0
      ? rerankPool
          .filter((c) => pickMap.has(c.row.id))
          .map((c) => {
            const pick = pickMap.get(c.row.id)!;
            return {
              ...c,
              // LLM fit은 20명을 한 번에 훑는 거친 판정이라 변별력이 낮다(실측: 대부분 동일 값).
              // 그래서 부적합 게이트로만 쓰고, 순위의 미세 차이는 규칙+유사도 점수가 만든다.
              final: Math.round(0.75 * c.score + 0.25 * pick.fit * 20),
              llm_fit: pick.fit,
              reason: pick.risk ? `${pick.reason} (유의: ${pick.risk})` : pick.reason,
            };
          })
          .sort((a, b) => b.final - a.final || b.raw_score - a.raw_score)
      : scored.map((c) => ({ ...c, final: c.score, llm_fit: null, reason: reasonFromSignals(c.signals) }))
  ).slice(0, limit);

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
    embedded: sim.map.size,
    llm_used: picks.length > 0,
    embedding_used: sim.map.size > 0,
    ...(sim.error || llmError ? { degraded_reason: [sim.error, llmError].filter(Boolean).join(' / ') } : {}),
  };

  return NextResponse.json({ data: { candidates, stats } });
}
