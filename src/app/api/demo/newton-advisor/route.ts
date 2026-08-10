import { NextRequest, NextResponse } from 'next/server';
import { getQwenAnthropicClient, qwenModel, isQwenConfigured } from '@/lib/qwen';
import { ADVISOR_SYSTEM, buildAdvisorUserPrompt, parsePlan } from '@/lib/newton-advisor';
import { DEMO_NOTES } from '@/app/demo/newton/fixtures/notes';
import { DEMO_ADVISOR_PLAN } from '@/app/demo/newton/fixtures/advisor-plan';

export const maxDuration = 30;

const MAX_NOTE_CHARS = 2000;
const RATE_LIMIT = 5; // 분당 IP별 허용 횟수
const WINDOW_MS = 60_000;

// 데모 전용 인메모리 리미터. 인증 없는 공개 엔드포인트라 남용만 막으면 충분하다.
const hits = new Map<string, number[]>();

function rateLimited(ip: string, now: number): boolean {
  const recent = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  // 오래된 IP 정리 — 장기 실행 시 맵이 계속 자라지 않게.
  if (hits.size > 500) {
    for (const [k, v] of hits) if (v.every(t => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return false;
}

/** 어떤 실패에도 화면이 비지 않도록 항상 플랜을 담아 200으로 응답한다. */
function fallback(reason: string) {
  return NextResponse.json({
    data: { plan: DEMO_ADVISOR_PLAN, live: false, reason },
    meta: { requestId: `newton-${Date.now()}` },
  });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip, Date.now())) return fallback('rate-limited');

  let note = '';
  try {
    const body = await request.json();
    note = typeof body?.note === 'string' ? body.note.slice(0, MAX_NOTE_CHARS) : '';
  } catch {
    return fallback('bad-request');
  }
  if (!note.trim()) return fallback('empty-note');
  if (!isQwenConfigured()) return fallback('llm-unconfigured');

  try {
    const resp = await getQwenAnthropicClient().messages.create({
      model: qwenModel('strong'),
      max_tokens: 8000,
      system: ADVISOR_SYSTEM,
      messages: [{ role: 'user', content: buildAdvisorUserPrompt(DEMO_NOTES, note) }],
    });

    const text = resp.content.map(b => (b.type === 'text' ? b.text : '')).join('');

    const plan = parsePlan(text);
    if (!plan) return fallback('unparsable');

    return NextResponse.json({
      data: { plan, live: true },
      meta: { requestId: `newton-${Date.now()}` },
    });
  } catch {
    return fallback('llm-error');
  }
}
