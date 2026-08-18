import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { anthropicErrorMessage } from '@/lib/anthropic-error';
import { getQwenAnthropicClient, qwenModel, isQwenConfigured } from '@/lib/qwen';
import { FUNNEL_STAGE_LABELS, FUNNEL_NEXT_ACTION, type FunnelStage } from '@/types/crm';
import type { ConsultationEntry, StrategyHistoryEntry } from '@/types/crm';

export const maxDuration = 30;

const MODEL = qwenModel('fast');

const SYSTEM = `당신은 SuperfastSAT의 노련한 세일즈 코치다. 한 리드의 현재 상태와 최근 상담 메모를 보고, 담당 매니저가 "다음에 무엇을 해야 하는지"를 즉시 알 수 있게 돕는다.
출력은 오직 JSON 하나. 형식: {"summary": "이 리드 상황 2~3문장 요약", "recommended_action": "지금 취할 다음 액션 한 문장(구체적으로)", "draft_message": "리드에게 바로 보낼 수 있는 카톡 메시지 초안(존댓말, 2~4문장, 이모지 최소)"}
규칙: 메모·단계 근거에 기반. 추상론·빈말 금지. 한국어. JSON 외 텍스트·코드펜스 금지.`;

const STUDENT_FIELDS =
  'id,name,grade,school_type,desired_subjects,previous_rw_score,previous_math_score,target_score,target_test_date,churn_type,churn_tag,inquiry_channel,traffic_source,lead_status,funnel_stage,funnel_stage_updated_at,created_at,last_contacted_at,consultation_timeline,strategy_history';

interface StudentRow {
  name: string;
  grade: string | null;
  school_type: string | null;
  desired_subjects: string | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
  target_score: number | null;
  target_test_date: string | null;
  churn_type: string | null;
  churn_tag: string | null;
  inquiry_channel: string | null;
  traffic_source: string | null;
  lead_status: string;
  funnel_stage: string;
  last_contacted_at: string | null;
  consultation_timeline: ConsultationEntry[] | null;
  strategy_history: StrategyHistoryEntry[] | null;
}

function buildContext(s: StudentRow): string {
  const lines: string[] = [];
  lines.push(`이름: ${s.name}`);
  lines.push(`학년/학제: ${s.grade ?? '-'} / ${s.school_type ?? '-'} · 희망: ${s.desired_subjects ?? '-'}`);
  const stage = FUNNEL_STAGE_LABELS[s.funnel_stage as FunnelStage] ?? s.funnel_stage;
  const nextHint = FUNNEL_NEXT_ACTION[s.funnel_stage as FunnelStage];
  lines.push(`현재 단계: ${stage}${nextHint ? ` (일반적 다음 행동: ${nextHint})` : ''} · 상태: ${s.lead_status}`);
  lines.push(`유입: ${[s.inquiry_channel, s.traffic_source].filter(Boolean).join(' · ') || '-'}`);
  const scores = [
    s.previous_rw_score != null ? `RW ${s.previous_rw_score}` : null,
    s.previous_math_score != null ? `Math ${s.previous_math_score}` : null,
    s.target_score != null ? `목표 ${s.target_score}` : null,
    s.target_test_date ? `시험 ${s.target_test_date}` : null,
  ].filter(Boolean).join(' · ');
  if (scores) lines.push(`점수/목표: ${scores}`);
  if (s.last_contacted_at) lines.push(`최근 연락: ${s.last_contacted_at.slice(0, 10)}`);
  if (s.churn_type || s.churn_tag) lines.push(`이탈 정보: ${[s.churn_type, s.churn_tag].filter(Boolean).join(' / ')}`);

  const memos = (s.consultation_timeline ?? [])
    .slice()
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 5)
    .map((m) => `- (${String(m.created_at).slice(0, 10)}) ${m.raw_memo || m.ai_purified || ''}`.trim())
    .filter((l) => l.length > 6);
  if (memos.length) lines.push(`\n최근 상담 메모:\n${memos.join('\n')}`);

  const strat = (s.strategy_history ?? []).slice(-3).map((e) => `- ${e.strategy_name}${e.memo ? ` (${e.memo})` : ''}`);
  if (strat.length) lines.push(`\n적용 전략:\n${strat.join('\n')}`);

  return lines.join('\n');
}

function parseResult(text: string): { summary: string; recommended_action: string; draft_message: string } | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1));
    return {
      summary: String(o.summary ?? ''),
      recommended_action: String(o.recommended_action ?? ''),
      draft_message: String(o.draft_message ?? ''),
    };
  } catch {
    return null;
  }
}

// POST /api/crm/students/:id/next-action → { data: {summary, recommended_action, draft_message} }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, { status: 401 });
  }

  if (!isQwenConfigured()) {
    return NextResponse.json({ error: { message: 'AI가 설정되지 않았습니다.' } }, { status: 503 });
  }

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .select(STUDENT_FIELDS)
    .eq('id', id)
    .single();
  if (error || !student) {
    return NextResponse.json({ error: { message: '리드를 찾을 수 없습니다.' } }, { status: 404 });
  }

  try {
    const client = getQwenAnthropicClient();
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: [{ type: 'text', text: SYSTEM }],
      messages: [{ role: 'user', content: `아래 리드에 대해 다음 액션을 JSON으로만 답하라.\n\n${buildContext(student as unknown as StudentRow)}` }],
    });
    const text = resp.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
    const result = parseResult(text);
    if (!result) {
      return NextResponse.json({ error: { message: 'AI 응답을 해석하지 못했습니다.' } }, { status: 502 });
    }
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('[next-action]', err);
    return NextResponse.json({ error: { message: anthropicErrorMessage(err) } }, { status: 502 });
  }
}
