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

const SYSTEM_PROMPT = `작성 조건:
1. 수신자: 오늘 상담에 참여한 학부모
2. 톤앤매너: 전문적이고 신뢰감 있으면서도 따뜻한 어조. 딱딱하지 않게.
3. 형식:
   - 앞뒤 인사말 없이 본문 내용만 작성
   - 첫 섹션 제목은 반드시 "📋 오늘 상담 내용"으로 시작
   - 본문: 오늘 확인된 주요 내용을 소주제별로 묶어 항목 정리
   - 마지막 섹션: "✅ 다음 단계"로 합의된 액션 아이템 정리
4. 주의사항:
   - 마크다운 문법 사용 금지 (**, ##, - 등 일체 사용하지 않음)
   - 항목 구분은 마크다운 대신 줄바꿈과 들여쓰기, · 또는 ✔ 같은 텍스트 기호 사용
   - 직원 내부 메모 특유의 표현은 학부모 친화적 언어로 자연스럽게 변환
   - 민감한 정보(ADHD 등)는 사실 그대로 적되, 배려 있는 표현으로 순화
   - 내부 검토 중인 사항과 확정된 사항을 명확히 구분
   - 한국어로 작성

반드시 다음 JSON 형식으로만 응답하세요:
{
  "purified": "위 조건으로 작성한 학부모용 상담 요약 메시지",
  "deleted_items": [],
  "coach_history": ""
}`;

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
