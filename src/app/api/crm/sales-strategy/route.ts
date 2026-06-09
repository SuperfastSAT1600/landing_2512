import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import Anthropic from '@anthropic-ai/sdk';
import { generateEmbedding, buildEmbeddingText } from '@/lib/embedding';
import {
  SALES_STRATEGY_SYSTEM_PROMPT,
  buildContextBlock,
  type StrategyStudent,
  type PastCase,
} from '@/lib/sales-strategy-context';

// 컨텍스트 구성·임베딩용으로 students에서 읽는 컬럼
const STUDENT_FIELDS =
  'id, name, grade, school_type, desired_subjects, previous_rw_score, previous_math_score, target_score, churn_type, churn_tag, inquiry_channel, traffic_source, lead_status, funnel_stage, consultation_timeline, reactivation_log';

const MODEL = 'claude-sonnet-4-6';
const SIMILAR_CASES = 6;

export const maxDuration = 60;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function errorJson(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** 유사 과거 사례 조회. 실패 시 빈 배열로 graceful degradation. */
async function fetchSimilarCases(current: StrategyStudent, lastUserText: string): Promise<PastCase[]> {
  try {
    const queryText = `${buildEmbeddingText(current as Parameters<typeof buildEmbeddingText>[0])}\n\n[매니저 질문]\n${lastUserText}`;
    const embedding = await generateEmbedding(queryText);

    const { data: matches, error } = await supabaseAdmin.rpc('match_students_for_strategy', {
      query_embedding: JSON.stringify(embedding),
      exclude_id: current.id,
      match_count: SIMILAR_CASES,
    });
    if (error || !matches?.length) return [];

    const ids = (matches as Array<{ id: string }>).map((m) => m.id);
    const simById = new Map<string, number>(
      (matches as Array<{ id: string; similarity: number }>).map((m) => [m.id, m.similarity]),
    );

    const { data: students } = await supabaseAdmin.from('students').select(STUDENT_FIELDS).in('id', ids);
    if (!students?.length) return [];

    return (students as StrategyStudent[])
      .map((s) => ({ student: s, similarity: simById.get(s.id) ?? 0 }))
      .sort((a, b) => b.similarity - a.similarity);
  } catch (err) {
    console.error('[sales-strategy] similar-case retrieval failed (degrading):', err);
    return [];
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return errorJson('UNAUTHORIZED', '인증이 필요합니다.', 401);
  }

  let body: { studentId?: string; messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return errorJson('INVALID_JSON', '잘못된 요청 형식입니다.', 400);
  }

  const { studentId, messages } = body;
  if (!studentId || !Array.isArray(messages) || messages.length === 0) {
    return errorJson('INVALID_INPUT', 'studentId와 messages가 필요합니다.', 400);
  }
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== 'user' || !lastMessage.content?.trim()) {
    return errorJson('INVALID_INPUT', '마지막 메시지는 사용자 입력이어야 합니다.', 400);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[sales-strategy] ANTHROPIC_API_KEY is not set');
    return errorJson('AI_NOT_CONFIGURED', 'AI 서비스가 설정되지 않았습니다.', 503);
  }

  // 현재 학생 조회
  const { data: current, error: studentErr } = await supabaseAdmin
    .from('students')
    .select(STUDENT_FIELDS)
    .eq('id', studentId)
    .single();
  if (studentErr || !current) {
    return errorJson('STUDENT_NOT_FOUND', '학생을 찾을 수 없습니다.', 404);
  }

  // 유사 과거 사례 + 컨텍스트 구성
  const cases = await fetchSimilarCases(current as StrategyStudent, lastMessage.content);
  const contextBlock = buildContextBlock(current as StrategyStudent, cases);

  const client = new Anthropic({ apiKey });
  let aborted = false;
  let claudeStream: ReturnType<Anthropic['messages']['stream']> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (text: string) => {
        // 클라이언트가 연결을 끊으면 컨트롤러가 닫혀 enqueue가 throw → 무시
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          /* controller closed */
        }
      };

      claudeStream = client.messages.stream({
        model: MODEL,
        max_tokens: 2048,
        system: [
          { type: 'text', text: SALES_STRATEGY_SYSTEM_PROMPT },
          { type: 'text', text: contextBlock, cache_control: { type: 'ephemeral' } },
        ],
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
          console.error('[sales-strategy] Claude stream error:', err);
          enqueue('\n\n[오류] AI 응답 생성에 실패했습니다.');
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
      // 클라이언트 연결 종료 → Claude 스트림도 중단해 토큰 낭비 방지
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
