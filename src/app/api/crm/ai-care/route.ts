import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import OpenAI from 'openai';
import { z } from 'zod';
import type { AiCareResult } from '@/types/crm';

const AiCareResultSchema = z.object({
  purified: z.string(),
  deleted_items: z.array(z.string()).optional().default([]),
  coach_history: z.string().optional().default(''),
});

const SYSTEM_PROMPT = `상담 메모를 바탕으로 학부모님께 전달할 상담 요약문을 작성하세요.

제외할 내용:
- 소개자·유입 경로·추천인 관련 정보
- 상담자의 추측·내부 판단 표현
- 영업·관계 관리 목적 정보
- 직원 간 공유용 표현 ("~라고 함", "모르심", "문의 주심" 등)
- 확정되지 않은 내용을 단정한 표현

작성 조건:
- 정중하고 신뢰감 있는 학부모 안내 문체
- 메모에 없는 내용 추가 금지 (메모에서 도출되는 학습 방향은 가능)
- 학생에 대한 단정적 표현 금지
- 확정되지 않은 내용은 "예정", "확인 예정" 등으로 표현
- 학부모님 제공 정보는 의미 단위로 그룹핑, 각 그룹에 소제목

섹션 2 기준:
- 메모에 명시된 안내 내용 우선 정리
- 없으면 학생 상황(환경·약점·목표)에서 자연스럽게 도출
- "~라고 안내드렸습니다" 형식으로 서술

출력 형식 (마크다운 사용 금지, · 기호 사용):

1. 학부모님께서 알려주신 정보
학부모님께서 수업 준비를 위해 알려주신 내용을 아래와 같이 정리했습니다.
① [소제목]
· [내용]
(그룹 수는 메모에 따라 조정)

2. 상담 중 안내드린 핵심 내용
[3~4문단 이내]

3. 앞으로의 수업 방향
[2~3문단 이내]

반드시 다음 JSON 형식으로만 응답하세요:
{"purified": "위 형식의 학부모용 상담 요약", "deleted_items": [], "coach_history": ""}`;

export const maxDuration = 60;

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
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `[상담 메모]\n${raw_memo.trim()}` },
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
