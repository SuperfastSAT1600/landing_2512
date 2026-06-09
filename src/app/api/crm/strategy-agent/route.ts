import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import Anthropic from '@anthropic-ai/sdk';
import { generateEmbedding } from '@/lib/embedding';
import { CHURN_TAG_OPTIONS } from '@/types/crm';
import type { StrategyStudent, PastCase } from '@/lib/sales-strategy-context';
import {
  STRATEGY_AGENT_SYSTEM_PROMPT,
  buildStrategyAgentContext,
  type ConversionStats,
} from '@/lib/strategy-agent-context';

// 과거 사례 카드 구성용으로 students에서 읽는 컬럼
const CASE_FIELDS =
  'id, name, grade, school_type, desired_subjects, previous_rw_score, previous_math_score, target_score, churn_type, churn_tag, inquiry_channel, traffic_source, lead_status, funnel_stage, consultation_timeline, reactivation_log';

const MODEL = 'claude-sonnet-4-6';
const RELEVANT_CASES = 8;
const WEB_SEARCH_MAX_USES = 5;

export const maxDuration = 60;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function errorJson(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// 이탈 판정 공통 필터 (funnel_stage='churned' 또는 lead_status='inactive')
const CHURNED_OR = 'funnel_stage.eq.churned,lead_status.eq.inactive';

/**
 * 우리 전체 전환 지표 — 결제 전환/이탈 누적 카운트, 전환율, 이탈 사유 분포.
 * 사유 분포는 고정된 churn_tag 후보별 head-count라 전체 기록을 정확히 반영(행 조회 없음).
 * 실패 시 빈 지표로 degrade.
 */
async function fetchConversionStats(): Promise<ConversionStats> {
  try {
    const base = () => supabaseAdmin.from('students').select('id', { count: 'exact', head: true });

    const [convertedRes, churnedRes, ...tagResults] = await Promise.all([
      base().or('lead_status.eq.enrolled,funnel_stage.eq.8'),
      base().or(CHURNED_OR),
      ...CHURN_TAG_OPTIONS.map((tag) => base().or(CHURNED_OR).eq('churn_tag', tag)),
    ]);

    const converted = convertedRes.count ?? 0;
    const churned = churnedRes.count ?? 0;
    const denom = converted + churned;

    const churnReasons = CHURN_TAG_OPTIONS.map((tag, i) => ({
      tag,
      count: tagResults[i].count ?? 0,
    }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      converted,
      churned,
      conversionRate: denom > 0 ? converted / denom : null,
      churnReasons,
    };
  } catch (err) {
    console.error('[strategy-agent] stats failed (degrading):', err);
    return { converted: 0, churned: 0, conversionRate: null, churnReasons: [] };
  }
}

/** 매니저 질문과 임베딩 유사도로 관련 과거 리드를 조회. 실패 시 빈 배열로 degrade. */
async function fetchRelevantCases(queryText: string): Promise<PastCase[]> {
  try {
    const embedding = await generateEmbedding(queryText);
    const { data: matches, error } = await supabaseAdmin.rpc('match_students', {
      query_embedding: JSON.stringify(embedding),
      match_count: RELEVANT_CASES,
    });
    if (error || !matches?.length) return [];

    const rows = matches as Array<{ id: string; similarity?: number }>;
    const ids = rows.map((m) => m.id);
    const simById = new Map<string, number>(rows.map((m) => [m.id, m.similarity ?? 0]));

    const { data: students } = await supabaseAdmin
      .from('students')
      .select(CASE_FIELDS)
      .in('id', ids);
    if (!students?.length) return [];

    return (students as StrategyStudent[])
      .map((s) => ({ student: s, similarity: simById.get(s.id) ?? 0 }))
      .sort((a, b) => b.similarity - a.similarity);
  } catch (err) {
    console.error('[strategy-agent] relevant-case retrieval failed (degrading):', err);
    return [];
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return errorJson('UNAUTHORIZED', '인증이 필요합니다.', 401);
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return errorJson('INVALID_JSON', '잘못된 요청 형식입니다.', 400);
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return errorJson('INVALID_INPUT', 'messages가 필요합니다.', 400);
  }
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== 'user' || !lastMessage.content?.trim()) {
    return errorJson('INVALID_INPUT', '마지막 메시지는 사용자 입력이어야 합니다.', 400);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[strategy-agent] ANTHROPIC_API_KEY is not set');
    return errorJson('AI_NOT_CONFIGURED', 'AI 서비스가 설정되지 않았습니다.', 503);
  }

  // 내부 데이터 컨텍스트 구성 (전환 지표 + 관련 과거 사례)
  const [stats, cases] = await Promise.all([
    fetchConversionStats(),
    fetchRelevantCases(lastMessage.content),
  ]);
  const contextBlock = buildStrategyAgentContext(stats, cases);

  const client = new Anthropic({ apiKey });
  let aborted = false;
  let claudeStream: ReturnType<Anthropic['messages']['stream']> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          /* controller closed */
        }
      };

      claudeStream = client.messages.stream({
        model: MODEL,
        max_tokens: 3072,
        system: [
          { type: 'text', text: STRATEGY_AGENT_SYSTEM_PROMPT },
          { type: 'text', text: contextBlock, cache_control: { type: 'ephemeral' } },
        ],
        // 인터넷 최신 사례·벤치마크를 직접 검색해 근거로 활용
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: WEB_SEARCH_MAX_USES }],
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      try {
        for await (const event of claudeStream) {
          if (aborted) break;
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            enqueue(event.delta.text);
          }
        }
      } catch (err) {
        if (!aborted) {
          console.error('[strategy-agent] Claude stream error:', err);
          enqueue(
            '\n\n[오류] AI 응답 생성에 실패했습니다. (웹 검색이 계정에 활성화되어 있는지 확인해주세요)'
          );
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      aborted = true;
      claudeStream?.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
