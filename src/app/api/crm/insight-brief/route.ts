import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { isAuthenticated } from '@/lib/server-auth';
import { buildBriefHealth, parsePeriod } from '@/lib/strategy-brief';
import { fallbackAreas, parseAreas } from '@/lib/insight-parse';
import type { InsightBriefMode as BriefMode, InsightPeriod } from '@/types/crm';

export const maxDuration = 30;

const MODEL = 'claude-haiku-4-5';

const BRIEF_SYSTEM = `당신은 SuperfastSAT의 날카로운 성장 전략 파트너다. **분석 기간에 인입한 리드 코호트**가 퍼널(인입→컨택→상담→진단→결제)에서 어디서 막히고 빠지는지(드롭오프)를 중심으로, "우리가 지금 해야 할 부분은 여기야"라고 가장 시급한 약점/정체를 짚고 각각에 "이렇게 해보자" 한 줄짜리 구체 첫 수를 제시한다. 내가 못 본 숨은 병목을 찾는 게 목적이다.
규칙: 빈 칭찬 금지. 추상론 금지. 아래 [KPI 건강 진단]의 수치(드롭오프·채널)에 근거할 것. 한국어, 간결하게.
출력은 오직 JSON 하나. 형식: {"areas":[{"title": "짧은 제목", "severity": "critical"|"warn", "why": "왜 중요한가 — 수치 근거 한 문장", "suggestion": "이렇게 해보자 — 구체 첫 수 한 문장"}]}
개수는 고정하지 마라. 지금 최우선으로 해결해야 할 것만 네가 자율 판단해 추려라 — 진짜 시급한 게 2~3개면 그만큼만 내고, 5개를 맞추려 억지로 채우지 마라. JSON 외 다른 텍스트·코드펜스 금지.`;

const WEEKLY_SYSTEM = `너는 SuperfastSAT 대표 이민재의 날카로운 성장 파트너다. 지금 만드는 건 이민재가 **월요일 아침 팀 '방향 맞추기' 회의**에서 꺼낼 논의 안건이다. 목표는 이민재가 혼자서는 놓쳤을 사각지대를 CRM 지표만으로 들춰내, "이번 주에 이건 꼭 해야 한다"를 스스로 깨닫게 하는 것.
관점: 이민재 1인칭. 회의 테이블에서 동료들에게 던질 안건처럼 써라.
각 항목은 (1) 논의점 = 짧은 제목 + 왜 지금 중요한지(반드시 아래 [KPI 건강 진단]의 수치를 근거로), (2) 그 자리에서 동료에게 던질 '날카로운 질문' 하나로 구성한다. 질문은 답이 뻔하지 않고 원인·책임·우선순위를 파고드는 한 문장이어야 한다.
규칙: "이렇게 해보자" 같은 지시형 해결책은 쓰지 마라(그건 다음 단계 전략 회의용이다). 빈 칭찬·추상론 금지. 수치 없는 문장 금지. 한국어, 간결하게.
출력은 오직 JSON 하나. 형식: {"areas":[{"title": "논의점 제목", "severity": "critical"|"warn", "why": "왜 지금 중요한가 — 수치 근거 한 문장", "question": "회의에서 던질 날카로운 질문 한 문장"}]}
areas는 정확히 5개(신호가 적으면 절대 수준이 낮은 단계·채널을 사각지대로 끌어와 5개를 채운다). JSON 외 다른 텍스트·코드펜스 금지.`;

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, { status: 401 });
  }

  let mode: BriefMode = 'diagnosis';
  let period: InsightPeriod | undefined;
  try {
    const body = await request.json();
    if (body?.mode === 'weekly') mode = 'weekly';
    period = parsePeriod(body);
  } catch {
    /* 본문 없음 → diagnosis 기본, 이번 달 기간 */
  }

  const origin = new URL(request.url).origin;
  const snap = await buildBriefHealth(origin, process.env.ADMIN_SECRET_KEY ?? '', period);

  // 통계 조회 실패 또는 약점 신호 없음 → 배너 숨김
  if (!snap || snap.weakest.length === 0) {
    return NextResponse.json({ generatedAt: new Date().toISOString(), areas: [] });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // LLM 미설정 → 결정론적 폴백으로라도 알림은 띄운다.
    return NextResponse.json({ generatedAt: new Date().toISOString(), areas: fallbackAreas(snap.weakest, mode) });
  }

  const systemPrompt = mode === 'weekly' ? WEEKLY_SYSTEM : BRIEF_SYSTEM;
  // 후보 힌트 = 실제 신호(패딩된 '관찰' 필러 제외). 강제 포함이 아니라 참고용.
  const refAreas = (snap.signals.length ? snap.signals : snap.weakest).map((s) => s.area).join(', ');
  const userContent =
    mode === 'weekly'
      ? `위 [KPI 건강 진단]을 근거로, 이번 주 방향 맞추기 회의에서 내가 꺼낼 논의 안건을 JSON으로만 답하라. 참고 후보 신호: ${refAreas}. 이 중 지금 최우선인 것만 네 자율 판단으로 골라라(2~3개여도 좋고 전부 포함할 필요 없음, 억지로 채우지 마라). 각 항목에 날카로운 질문을 붙여라.`
      : `위 [KPI 건강 진단]을 근거로 "우리가 지금 해야 할 부분"을 JSON으로만 답하라. 참고 후보 신호: ${refAreas}. 이 중 지금 최우선으로 해결해야 할 것만 네 자율 판단으로 골라라(2~3개여도 좋고 전부 포함할 필요 없음, 5개를 맞추려 억지로 채우지 마라).`;

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1300,
      system: [
        { type: 'text', text: systemPrompt },
        { type: 'text', text: snap.summaryText, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userContent }],
    });
    const text = resp.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
    const areas = parseAreas(text, snap.weakest, mode);
    return NextResponse.json({ generatedAt: new Date().toISOString(), areas });
  } catch (err) {
    console.error('[insight-brief]', err);
    // 크레딧 부족 등 → 결정론적 폴백
    return NextResponse.json({ generatedAt: new Date().toISOString(), areas: fallbackAreas(snap.weakest, mode) });
  }
}
