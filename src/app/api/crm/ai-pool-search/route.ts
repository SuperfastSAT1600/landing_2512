import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const MatchSchema = z.object({
  id: z.string(),
  reason: z.string(),
});

const ResponseSchema = z.object({
  matches: z.array(MatchSchema),
});

export type AiPoolSearchMatch = z.infer<typeof MatchSchema>;

const SYSTEM_PROMPT = `당신은 SAT 튜터링 CRM의 AI 검색 어시스턴트입니다.
관리자가 입력한 자연어 검색 쿼리를 분석하여, 이탈/재활성화 학생 목록에서 가장 관련성 높은 학생을 찾아 반환합니다.

각 학생 프로필(이름, 학년, 이탈 사유, 상담 내용 등)을 분석하고 쿼리와의 관련성을 판단하세요.

규칙:
- matches는 관련성 높은 순으로 정렬하세요.
- 명확히 관련 없는 학생은 포함하지 마세요.
- reason은 한 문장으로, 왜 이 학생이 쿼리와 관련 있는지 구체적으로 설명하세요.
- 관련 학생이 없으면 matches를 빈 배열로 반환하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "matches": [
    { "id": "학생_UUID", "reason": "이유 한 문장" }
  ]
}`;

function buildStudentProfile(student: {
  id: string;
  name: string;
  grade: string;
  desired_subjects: string;
  churn_type: string | null;
  churn_tag: string | null;
  updated_at: string;
  previous_rw_score: number | null;
  previous_math_score: number | null;
  target_score: number | null;
  lead_status: string;
  consultation_timeline: Array<{ raw_memo?: string; ai_purified?: string; created_at: string }> | null;
  reactivation_log: Array<{ strategy: string; outcome: string }> | null;
}): string {
  const daysChurned = Math.floor(
    (Date.now() - new Date(student.updated_at).getTime()) / 86400000
  );

  const scoreInfo = (() => {
    const rw = student.previous_rw_score;
    const math = student.previous_math_score;
    if (rw !== null && math !== null) return `직전 ${rw + math}점`;
    if (rw !== null) return `직전 RW ${rw}`;
    if (math !== null) return `직전 Math ${math}`;
    return '점수 없음';
  })();

  const targetInfo = student.target_score ? ` → 목표 ${student.target_score}점` : '';

  // 최신 상담 메모 최대 2개
  const timeline = (student.consultation_timeline ?? [])
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 2)
    .map((e) => (e.ai_purified ?? e.raw_memo ?? '').slice(0, 80))
    .filter(Boolean);

  // 재활성화 이력
  const reactivations = (student.reactivation_log ?? [])
    .slice(-2)
    .map((r) => `${r.strategy.slice(0, 40)}(${r.outcome})`)
    .join(', ');

  const lines = [
    `ID: ${student.id}`,
    `${student.name} | ${student.grade} | ${student.desired_subjects}`,
    `이탈: ${student.churn_type ?? '-'} / ${student.churn_tag ?? '-'} | ${daysChurned}일 경과 | 상태: ${student.lead_status}`,
    `${scoreInfo}${targetInfo}`,
  ];
  if (timeline.length > 0) lines.push(`상담: ${timeline.join(' / ')}`);
  if (reactivations) lines.push(`재활성화 시도: ${reactivations}`);

  return lines.join('\n');
}

/**
 * POST /api/crm/ai-pool-search
 * 자연어 쿼리로 이탈/재활성화 학생 풀을 AI 검색.
 * Body: { query: string }
 * Returns: { data: { matches: Array<{ id, reason }> } }
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: '잘못된 요청 형식입니다.' } },
      { status: 400 }
    );
  }

  const { query } = body;
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json(
      { error: { code: 'MISSING_QUERY', message: '검색 쿼리를 입력해주세요.' } },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: 'AI_NOT_CONFIGURED', message: 'AI 서비스가 설정되지 않았습니다.' } },
      { status: 503 }
    );
  }

  // 이탈 + 재활성화 학생 전체 조회
  const { data: students, error: fetchError } = await supabaseAdmin
    .from('students')
    .select(
      'id, name, grade, desired_subjects, churn_type, churn_tag, updated_at, previous_rw_score, previous_math_score, target_score, lead_status, consultation_timeline, reactivation_log'
    )
    .in('lead_status', ['inactive', 'reactivating'])
    .order('updated_at', { ascending: false });

  if (fetchError) {
    console.error('[ai-pool-search] fetch error', fetchError);
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: '학생 데이터 조회에 실패했습니다.' } },
      { status: 500 }
    );
  }

  if (!students || students.length === 0) {
    return NextResponse.json({ data: { matches: [] } });
  }

  const profiles = students.map(buildStudentProfile).join('\n\n---\n\n');
  const userMessage = `[검색 쿼리]\n${query.trim()}\n\n[학생 목록]\n\n${profiles}`;

  const client = new Anthropic({ apiKey });

  let rawContent: string;
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const block = message.content[0];
    if (!block || block.type !== 'text') throw new Error('Unexpected AI response format');
    rawContent = block.text;
  } catch (err) {
    console.error('[ai-pool-search] Claude API error:', err);
    return NextResponse.json(
      { error: { code: 'AI_FAILED', message: 'AI 검색에 실패했습니다.' } },
      { status: 502 }
    );
  }

  let parsed: unknown;
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[ai-pool-search] JSON parse error:', err, 'raw:', rawContent);
    return NextResponse.json(
      { error: { code: 'AI_INVALID_FORMAT', message: 'AI 응답 파싱에 실패했습니다.' } },
      { status: 502 }
    );
  }

  const validation = ResponseSchema.safeParse(parsed);
  if (!validation.success) {
    console.error('[ai-pool-search] schema error:', validation.error.flatten());
    return NextResponse.json(
      { error: { code: 'AI_SCHEMA_MISMATCH', message: 'AI 응답 형식이 올바르지 않습니다.' } },
      { status: 502 }
    );
  }

  // 실제 존재하는 학생 ID만 필터 (AI 할루시네이션 방어)
  const validIds = new Set(students.map((s) => s.id));
  const safeMatches = validation.data.matches.filter((m) => validIds.has(m.id));

  return NextResponse.json({ data: { matches: safeMatches } });
}
