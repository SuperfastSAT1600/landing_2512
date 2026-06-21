/**
 * 심화 인사이트 — 정량 KPI + 상담 메모 정성 신호 + 구루 렌즈 + 웹 검색을 합성(Sonnet).
 * 무겁고 느려서(웹 검색 포함) 하루 1회 서버 캐시(crm_insight_cache). 배너의 2단계 중 Stage 2.
 * fast(insight-brief)는 그대로 두고, 배너가 이 결과가 오면 교체한다.
 */
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildBriefHealth } from '@/lib/strategy-brief';
import { buildMemoSignals } from '@/lib/strategy-memos';
import { fallbackAreas, parseAreas } from '@/lib/insight-parse';
import { DEEP_DIAGNOSIS_SYSTEM, DEEP_WEEKLY_SYSTEM } from '@/lib/insight-deep';
import { STRATEGY_GURU_PROMPT } from '@/lib/strategy-guru';
import { kstDateStr, type InsightBriefArea as BriefArea, type InsightBriefMode as BriefMode } from '@/types/crm';

export const maxDuration = 60;

const MODEL = 'claude-sonnet-4-6';
const WEB_SEARCH_MAX_USES = 3;

async function readCache(dateKst: string, mode: BriefMode): Promise<BriefArea[] | null> {
  try {
    const { data } = await supabaseAdmin
      .from('crm_insight_cache')
      .select('payload')
      .eq('date_kst', dateKst)
      .eq('mode', mode)
      .maybeSingle();
    const areas = (data?.payload as { areas?: BriefArea[] } | undefined)?.areas;
    return Array.isArray(areas) ? areas : null;
  } catch {
    return null; // 테이블 미생성 등 → 캐시 없이 생성 진행
  }
}

async function writeCache(dateKst: string, mode: BriefMode, areas: BriefArea[]): Promise<void> {
  try {
    await supabaseAdmin
      .from('crm_insight_cache')
      .upsert({ date_kst: dateKst, mode, payload: { areas }, generated_at: new Date().toISOString() }, { onConflict: 'date_kst,mode' });
  } catch (err) {
    console.error('[insight-brief/deep] cache write failed (non-fatal):', err);
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, { status: 401 });
  }

  let mode: BriefMode = 'diagnosis';
  try {
    const body = await request.json();
    if (body?.mode === 'weekly') mode = 'weekly';
  } catch {
    /* 본문 없음 → diagnosis 기본 */
  }
  const force = new URL(request.url).searchParams.get('force') === '1';
  const dateKst = kstDateStr(Date.now());

  // 서버 일 1회 캐시 (force면 우회)
  if (!force) {
    const cached = await readCache(dateKst, mode);
    if (cached) return NextResponse.json({ generatedAt: new Date().toISOString(), areas: cached, cached: true });
  }

  const origin = new URL(request.url).origin;
  const [snap, memo] = await Promise.all([
    buildBriefHealth(origin, process.env.ADMIN_SECRET_KEY ?? ''),
    buildMemoSignals(),
  ]);

  // 통계 조회 실패 또는 약점 신호 없음 → 배너 숨김(빈 areas)
  if (!snap || snap.weakest.length === 0) {
    return NextResponse.json({ generatedAt: new Date().toISOString(), areas: [] });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ generatedAt: new Date().toISOString(), areas: fallbackAreas(snap.weakest, mode) });
  }

  const systemPrompt = mode === 'weekly' ? DEEP_WEEKLY_SYSTEM : DEEP_DIAGNOSIS_SYSTEM;
  const userContent =
    mode === 'weekly'
      ? `위 [KPI 건강 진단]과 [상담 메모 신호]를 교차해, 이번 주 방향 맞추기 회의에서 내가 꺼낼 논의 안건 5개를 JSON으로만 답하라. 가장 시급한 영역(${snap.weakest.map((s) => s.area).join(', ')})을 반드시 포함하고, 각 항목에 구루 렌즈와 날카로운 질문을 붙여라.`
      : `위 [KPI 건강 진단]과 [상담 메모 신호]를 교차해, 지금 가장 시급한 5개 영역을 JSON으로만 답하라. 가장 시급한 영역(${snap.weakest.map((s) => s.area).join(', ')})을 반드시 포함하고, 각 항목에 구루 렌즈와 구체 첫 수를 붙여라.`;

  // 내부 데이터 블록: KPI 진단 + (있으면) 상담 메모 신호
  const dataBlock = memo.memoBlock ? `${snap.summaryText}\n\n${memo.memoBlock}` : snap.summaryText;

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 3500,
      system: [
        { type: 'text', text: systemPrompt },
        { type: 'text', text: STRATEGY_GURU_PROMPT, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: dataBlock, cache_control: { type: 'ephemeral' } },
      ],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: WEB_SEARCH_MAX_USES }],
      messages: [{ role: 'user', content: userContent }],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('');
    const areas = parseAreas(text, snap.weakest, mode);
    await writeCache(dateKst, mode, areas);
    return NextResponse.json({ generatedAt: new Date().toISOString(), areas });
  } catch (err) {
    console.error('[insight-brief/deep]', err);
    return NextResponse.json({ generatedAt: new Date().toISOString(), areas: fallbackAreas(snap.weakest, mode) });
  }
}
