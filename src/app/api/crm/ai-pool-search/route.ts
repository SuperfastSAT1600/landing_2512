import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { generateEmbedding } from '@/lib/embedding';

const MatchSchema = z.object({
  id: z.string(),
  reason: z.string(),
});

const ResponseSchema = z.object({
  matches: z.array(MatchSchema),
});

export type AiPoolSearchMatch = z.infer<typeof MatchSchema>;

const SYSTEM_PROMPT = `당신은 SAT 튜터링 CRM의 AI 검색 어시스턴트입니다.
관리자가 입력한 자연어 검색 쿼리를 분석하여, 후보 학생 목록에서 가장 관련성 높은 학생을 찾아 반환합니다.

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
  previous_rw_score: number | null;
  previous_math_score: number | null;
  target_score: number | null;
  lead_status: string;
  consultation_timeline: Array<{ raw_memo?: string; ai_purified?: string; created_at?: string }> | null;
  reactivation_log: Array<{ strategy: string; outcome: string }> | null;
}): string {
  const scoreInfo = (() => {
    const rw = student.previous_rw_score;
    const math = student.previous_math_score;
    if (rw !== null && math !== null) return `직전 ${rw + math}점 (RW ${rw} / Math ${math})`;
    if (rw !== null) return `직전 RW ${rw}`;
    if (math !== null) return `직전 Math ${math}`;
    return '점수 없음';
  })();

  // 전체 상담 내용 (잘림 없음)
  const timeline = (student.consultation_timeline ?? [])
    .sort((a, b) => ((a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1))
    .map((e) => {
      const date = e.created_at?.slice(0, 10) ?? '';
      const memo = (e.ai_purified ?? e.raw_memo ?? '').trim();
      return memo ? `  [${date}] ${memo}` : null;
    })
    .filter(Boolean);

  const reactivations = (student.reactivation_log ?? [])
    .map((r) => `${r.strategy}(${r.outcome})`)
    .join(', ');

  const lines = [
    `ID: ${student.id}`,
    `${student.name} | ${student.grade} | ${student.desired_subjects}`,
    `이탈: ${student.churn_type ?? '-'} / ${student.churn_tag ?? '-'} | 상태: ${student.lead_status}`,
    scoreInfo,
  ];
  if (timeline.length > 0) {
    lines.push('상담 기록:');
    lines.push(...(timeline as string[]));
  }
  if (reactivations) lines.push(`재활성화 시도: ${reactivations}`);

  return lines.join('\n');
}

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
  if (!query?.trim()) {
    return NextResponse.json(
      { error: { code: 'MISSING_QUERY', message: '검색 쿼리를 입력해주세요.' } },
      { status: 400 }
    );
  }

  // 1단계: 쿼리 임베딩 생성
  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(query.trim());
  } catch (err) {
    console.error('[ai-pool-search] embedding error', err);
    return NextResponse.json(
      { error: { code: 'EMBEDDING_FAILED', message: '임베딩 생성에 실패했습니다.' } },
      { status: 502 }
    );
  }

  // 2단계: pgvector 유사도 검색 → 상위 20명
  const { data: vectorResults, error: vecErr } = await supabaseAdmin.rpc('match_students', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: 20,
  });

  // 임베딩 없는 학생 fallback: 이름 검색
  let candidates: string[] = vectorResults?.map((r: { id: string }) => r.id) ?? [];

  if (vecErr || candidates.length === 0) {
    console.warn('[ai-pool-search] vector search fallback', vecErr?.message);
    const { data: fallback } = await supabaseAdmin
      .from('students')
      .select('id')
      .in('lead_status', ['inactive', 'reactivating'])
      .ilike('name', `%${query.trim()}%`)
      .limit(20);
    candidates = fallback?.map((r) => r.id) ?? [];
  }

  if (candidates.length === 0) {
    return NextResponse.json({ data: { matches: [] } });
  }

  // 3단계: 후보 학생 상세 조회
  const { data: students, error: fetchErr } = await supabaseAdmin
    .from('students')
    .select('id, name, grade, desired_subjects, churn_type, churn_tag, previous_rw_score, previous_math_score, target_score, lead_status, consultation_timeline, reactivation_log')
    .in('id', candidates);

  if (fetchErr || !students?.length) {
    return NextResponse.json({ data: { matches: [] } });
  }

  // 4단계: Claude 재랭킹
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: 'AI_NOT_CONFIGURED', message: 'AI 서비스가 설정되지 않았습니다.' } },
      { status: 503 }
    );
  }

  const profiles = students.map(buildStudentProfile).join('\n\n---\n\n');
  const userMessage = `[검색 쿼리]\n${query.trim()}\n\n[후보 학생 목록]\n\n${profiles}`;

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
  } catch {
    return NextResponse.json(
      { error: { code: 'AI_INVALID_FORMAT', message: 'AI 응답 파싱에 실패했습니다.' } },
      { status: 502 }
    );
  }

  const validation = ResponseSchema.safeParse(parsed);
  if (!validation.success) {
    return NextResponse.json(
      { error: { code: 'AI_SCHEMA_MISMATCH', message: 'AI 응답 형식이 올바르지 않습니다.' } },
      { status: 502 }
    );
  }

  const validIds = new Set(students.map((s) => s.id));
  const safeMatches = validation.data.matches.filter((m) => validIds.has(m.id));

  return NextResponse.json({ data: { matches: safeMatches } });
}
