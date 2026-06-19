import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { isAuthenticated } from '@/lib/server-auth';
import { buildBriefHealth } from '@/lib/strategy-brief';
import type { Signal } from '@/lib/strategy-health';

export const maxDuration = 30;

const MODEL = 'claude-haiku-4-5';

interface BriefArea {
  title: string;
  severity: 'critical' | 'warn';
  why: string;
  suggestion: string;
}

const BRIEF_SYSTEM = `당신은 SuperfastSAT의 날카로운 성장 전략 파트너다. **이번 달 인입한 리드 코호트**가 퍼널(인입→컨택→상담→진단→결제)에서 어디서 막히고 빠지는지(드롭오프)를 중심으로, 지금 가장 시급한 약점/정체를 짚고 각각에 "이렇게 해보자" 한 줄짜리 구체 첫 수를 제시한다. 내가 못 본 숨은 병목을 찾는 게 목적이다.
규칙: 빈 칭찬 금지. 추상론 금지. 아래 [KPI 건강 진단]의 수치(드롭오프·채널)에 근거할 것. 한국어, 간결하게.
출력은 오직 JSON 하나. 형식: {"areas":[{"title": "짧은 제목", "severity": "critical"|"warn", "why": "왜 중요한가 — 수치 근거 한 문장", "suggestion": "이렇게 해보자 — 구체 첫 수 한 문장"}]}
areas는 정확히 5개(약점 신호가 적으면 다음 우선순위·잠재 위험 영역까지 포함해 5개를 채운다). JSON 외 다른 텍스트·코드펜스 금지.`;

function fallbackAreas(weakest: Signal[]): BriefArea[] {
  return weakest.slice(0, 5).map((s) => ({
    title: s.area,
    severity: s.severity,
    why: s.note,
    suggestion: '전략 AI에서 이어서 점검·해결책을 설계하세요.',
  }));
}

function parseAreas(text: string, weakest: Signal[]): BriefArea[] {
  try {
    const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('no json');
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    const areas = Array.isArray(parsed.areas) ? parsed.areas : [];
    const valid = areas
      .filter((a: unknown): a is BriefArea => {
        const o = a as Record<string, unknown>;
        return !!o && typeof o.title === 'string' && typeof o.why === 'string' && typeof o.suggestion === 'string';
      })
      .map((a: BriefArea) => ({
        title: a.title,
        severity: a.severity === 'critical' ? 'critical' : 'warn',
        why: a.why,
        suggestion: a.suggestion,
      }))
      .slice(0, 5);
    return valid.length > 0 ? valid : fallbackAreas(weakest);
  } catch {
    return fallbackAreas(weakest);
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const snap = await buildBriefHealth(origin, process.env.ADMIN_SECRET_KEY ?? '');

  // 통계 조회 실패 또는 약점 신호 없음 → 배너 숨김
  if (!snap || snap.weakest.length === 0) {
    return NextResponse.json({ generatedAt: new Date().toISOString(), areas: [] });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // LLM 미설정 → 결정론적 폴백으로라도 알림은 띄운다.
    return NextResponse.json({ generatedAt: new Date().toISOString(), areas: fallbackAreas(snap.weakest) });
  }

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1300,
      system: [
        { type: 'text', text: BRIEF_SYSTEM },
        { type: 'text', text: snap.summaryText, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: `위 [KPI 건강 진단]에서 가장 시급한 영역(${snap.weakest.map((s) => s.area).join(', ')})을 포함해 정확히 5개로 추려 JSON으로만 답하라.`,
        },
      ],
    });
    const text = resp.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
    const areas = parseAreas(text, snap.weakest);
    return NextResponse.json({ generatedAt: new Date().toISOString(), areas });
  } catch (err) {
    console.error('[insight-brief]', err);
    // 크레딧 부족 등 → 결정론적 폴백
    return NextResponse.json({ generatedAt: new Date().toISOString(), areas: fallbackAreas(snap.weakest) });
  }
}
