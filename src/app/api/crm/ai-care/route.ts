import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import OpenAI from 'openai';
import { z } from 'zod';
import type { AiCareResult } from '@/types/crm';

const AiCareResultSchema = z.object({
  purified: z.string(),
  deleted_items: z.array(z.string()),
  coach_history: z.string(),
});

const SYSTEM_PROMPT = `당신은 SAT 교육 CRM 시스템의 상담 메모 변환 AI입니다.
매니저가 작성한 원본 상담 메모를 받아 세 가지 역할을 수행합니다.

역할 1 - 순화 (purified):
학부모에게 보여줄 수 있도록 메모를 정제합니다.
다음 내용은 반드시 삭제하세요:
- 가격/비용에 대한 불만이나 부정적 언급
- 학생 또는 학부모에 대한 부정적 평가나 태도 묘사
- 내부 운영 판단이나 팀 내부 의사결정 관련 메모
- 거친 표현, 비속어, 업무적 슬랭
정제 후 남은 내용을 자연스러운 존댓말로 작성하세요.

역할 2 - 삭제 목록 (deleted_items):
삭제된 내용 각 항목을 간략히 요약한 배열로 반환하세요. (매니저 확인용)
삭제된 내용이 없으면 빈 배열 []을 반환하세요.

역할 3 - 교육 이력 분리 (coach_history):
메모에서 코치에게 전달할 교육 이력 관련 내용만 추출하세요.
예: 이전 학원, 학습 습관, 과목별 특이사항, 시험 응시 이력, 학습 목표 등.
해당 내용이 없으면 빈 문자열을 반환하세요.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "purified": "학부모용 순화본",
  "deleted_items": ["삭제 항목1", "삭제 항목2"],
  "coach_history": "코치용 교육 이력"
}`;

/**
 * POST /api/crm/ai-care
 * Transforms a raw consultation memo using OpenAI.
 * Returns purified text for parents, deleted item list, and coach history.
 * Body: { raw_memo: string }
 * Requires admin authentication.
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { raw_memo: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { raw_memo } = body;
  if (!raw_memo || typeof raw_memo !== 'string' || raw_memo.trim().length === 0) {
    return NextResponse.json({ error: 'raw_memo is required' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[ai-care] OPENAI_API_KEY is not set');
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }

  const client = new OpenAI({ apiKey });

  let rawContent: string;
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `다음 상담 메모를 변환해주세요:\n\n${raw_memo.trim()}` },
      ],
    });

    rawContent = response.choices[0]?.message?.content ?? '';
    if (!rawContent) throw new Error('Empty response from OpenAI');
  } catch (err) {
    console.error('[ai-care] OpenAI API error:', err);
    return NextResponse.json({ error: 'AI processing failed' }, { status: 502 });
  }

  let parsed: unknown;
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[ai-care] JSON parse error:', err, 'raw:', rawContent);
    return NextResponse.json({ error: 'AI returned invalid format' }, { status: 502 });
  }

  const validation = AiCareResultSchema.safeParse(parsed);
  if (!validation.success) {
    console.error('[ai-care] Zod validation failed:', validation.error.flatten());
    return NextResponse.json({ error: 'AI response schema mismatch' }, { status: 502 });
  }

  const result: AiCareResult = validation.data;
  return NextResponse.json({ data: result });
}
