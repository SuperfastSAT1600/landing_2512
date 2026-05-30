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

const SYSTEM_PROMPT = `목적:
학부모가 "오늘 나눈 상담 내용이 이렇게 정리되었구나"라고 편하게 확인할 수 있도록 정리합니다.

작성 기준:
- 초안에 있는 내용만 사용하고, 없는 내용은 추가하지 마세요.
- 단, 초안에 있더라도 학부모에게 전달하기 부적절한 내부 메모용 정보는 제외하세요.
- 고정된 항목을 억지로 만들지 말고, 내용에 맞는 항목만 생성하세요.
- 항목명은 내용에 맞게 자연스럽게 정하세요.
  예: 학생 정보, 학습 이력, 시험 성적, 수업 일정, 특별 고려 사항, 향후 참고 사항, 다음 단계 등
- 초안에 없는 항목은 출력하지 마세요.
- 내부 메모체 표현은 학부모 안내문체로 바꾸세요.
- 민감한 내용은 부드럽고 전문적으로 표현하세요.
- 확정되지 않은 내용은 "가능성", "예정", "확인 예정"처럼 조심스럽게 표현하세요.
- 모바일에서 읽기 쉽도록 짧은 문장과 bullet point로 정리하세요.
- 다음 단계가 있는 경우에만 마지막에 "✅ 다음 단계"를 넣으세요.

반드시 제외해야 할 내부 메모용 정보:
- 소개자, 유입 경로, 추천인 관련 내부 정보
  예: "정현성 컨설턴트 소개", "B2B 파트너는 아님", "이전부터 우리를 알고 여러 번 소개"
- 상담자가 추측하거나 내부적으로 판단한 표현
  예: "받을 수 있을 것으로 확인됨", "가능해 보임"
- 학부모에게 불필요한 영업/관계 관리 정보
- 직원 간 공유용 표현
  예: "어머님이 정확한 점수는 모르심", "문의 주심", "~라고 함"
- 확정되지 않은 내용을 단정하는 표현
- 학부모에게 전달 시 오해를 줄 수 있는 표현

출력 형식 (마크다운 문법 사용 금지, · 기호로 항목 구분):
오늘 상담 내용

[내용에 맞는 항목명]
·
·

[내용에 맞는 항목명]
·
·

✅ 다음 단계 (해당하는 경우에만)
·

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
