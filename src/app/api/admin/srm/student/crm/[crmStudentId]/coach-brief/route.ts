import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import OpenAI from 'openai';
import type { ConsultationEntry } from '@/types/crm';

// 코치에게 전달하는 학생 브리핑 — 내부 세일즈/관계 정보 제거, 학습 정보만 보존
const SYSTEM_PROMPT = `당신은 SAT 튜터링 회사의 내부 상담 메모를 코치용 학생 브리핑으로 변환합니다.

[엄격히 제거할 항목 — 한 글자도 남기지 말 것]
1. 코치 본인 또는 특정 강사에 대한 평가·신뢰·이미지 관련 내용
   예: "○○님에 대한 믿음이 필요", "전문가 이미지 전달 중요", "코치 신뢰 형성 필요"
2. 세일즈·영업·유입·추천 관련 모든 내용
   예: 유입 경로, 추천인, 영업 전략, 결제/가격 언급
3. 내부 직원 커뮤니케이션 표현
   예: "~라고 함", "모르심", "안내 완료", "시범수업 진행 예정" 등 운영 상태 메모
4. 담당자 이름, 내부 코드, 미확정 추측 표현

[보존할 내용 — 코치가 수업에 필요한 정보만]
- 학생 학습 이력 (이전 튜터링, 학교 배경, 공부 경험)
- 현재 점수 (모의고사, 진단 결과)
- 목표 점수 및 시험 일정
- 수업 의지, 학습 습관, 숙제 계획, 주간 수업 선호 시간
- 학생 특성 중 코칭에 직접 유용한 것 (성격, 학습 스타일 — 세일즈 목적 제외)
- 약점 영역 (메모에 명시된 것만)

[중요 규칙]
- 메모에 없는 내용 절대 추가 금지
- 모호하면 제거하는 쪽 선택
- JSON 형식으로만 반환: {"coach_history": "정제된 코치용 내용"}`;

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ crmStudentId: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { crmStudentId } = await params;

  const { data: raw, error: fetchError } = await supabaseAdmin
    .from('students')
    .select('id, name, consultation_timeline')
    .eq('id', crmStudentId)
    .single();

  if (fetchError || !raw) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const student = raw as unknown as { id: string; name: string; consultation_timeline: unknown };
  const timeline: ConsultationEntry[] = Array.isArray(student.consultation_timeline)
    ? (student.consultation_timeline as ConsultationEntry[])
    : [];

  const toProcess = timeline.filter((e) => e.raw_memo?.trim());
  if (toProcess.length === 0) {
    return NextResponse.json({ error: 'No memos to process' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }

  const client = new OpenAI({ apiKey });

  const updated: ConsultationEntry[] = [...timeline];

  for (const entry of toProcess) {
    let coachHistory = '';
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `[상담 메모 — ${student.name}]\n${entry.raw_memo!.trim()}` },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { coach_history?: string };
        coachHistory = parsed.coach_history ?? '';
      }
    } catch (err) {
      console.error('[coach-brief] AI error for entry', entry.id, err);
      // 실패 시 해당 항목은 건너뜀
      continue;
    }

    const idx = updated.findIndex((e) => e.id === entry.id);
    if (idx !== -1) {
      updated[idx] = { ...updated[idx], ai_coach_history: coachHistory };
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('students')
    .update({ consultation_timeline: updated })
    .eq('id', crmStudentId);

  if (updateError) {
    console.error('[coach-brief] DB update error:', updateError);
    return NextResponse.json({ error: 'Failed to save brief' }, { status: 500 });
  }

  const processedCount = toProcess.length;
  return NextResponse.json({ data: { processed: processedCount } });
}
