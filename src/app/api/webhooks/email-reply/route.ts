import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { sendSnoozeConfirmEmail } from '@/lib/nudge-email';

const REPLY_DOMAIN = 'argonautai.co.kr';
const DEFAULT_SNOOZE_H = 12;

const SNOOZE_RULES = `
유저의 이메일 답장을 분석해 적절한 스누즈 기간(시간 단위)을 반환하세요.

규칙:
- "잡을게요", "이번 주", "곧", "할게요" 등 근시일 내 의도 → 72 (3일)
- "여행", "출장", "해외", "방학" → 168 (7일)
- "아파", "몸살", "병원", "피곤" → 120 (5일)
- "이미 잡았", "등록했", "완료" → 24 (1일, 다음 스캔에서 자동 해제)
- 기타 / 불명확 → 12

반드시 JSON으로만 응답하세요: {"hours": <숫자>, "reason": "<한 문장 요약>"}
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = parseInboundPayload(body, request.headers.get('content-type') ?? '');

    const profileId = extractProfileId(params.to ?? '');
    if (!profileId) {
      console.warn('[email-reply] profile ID 추출 실패:', params.to);
      return NextResponse.json({ ok: false, reason: 'no_profile_id' });
    }

    const replyText = params.text ?? params.html ?? '';
    const { hours, reason } = await analyzeReply(replyText);

    const now = new Date();
    const snoozeUntil = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const { data: state } = await supabaseSFv2
      .from('schedule_nudge_state')
      .select('email, name, user_type')
      .eq('sfv2_profile_id', profileId)
      .limit(1)
      .single();

    if (!state) {
      console.warn('[email-reply] nudge state 없음:', profileId);
      return NextResponse.json({ ok: false, reason: 'state_not_found' });
    }

    await supabaseSFv2
      .from('schedule_nudge_state')
      .update({
        next_allowed_at: snoozeUntil.toISOString(),
        snooze_reason: reason,
        updated_at: now.toISOString(),
      })
      .eq('sfv2_profile_id', profileId);

    await sendSnoozeConfirmEmail(
      { sfv2ProfileId: profileId, name: state.name as string, email: state.email as string },
      snoozeUntil,
      reason,
    );

    console.log(`[email-reply] ${state.name} 스누즈 ${hours}h — "${reason}"`);
    return NextResponse.json({ ok: true, profileId, hours, reason });
  } catch (err) {
    console.error('[email-reply] 오류:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function extractProfileId(toAddress: string): string | null {
  // "nudge+<profileId>@argonautai.co.kr" 형식에서 profileId 추출
  const match = toAddress.match(/nudge\+([^@]+)@/);
  return match ? match[1] : null;
}

function parseInboundPayload(
  body: string,
  contentType: string,
): Record<string, string> {
  if (contentType.includes('application/json')) {
    try { return JSON.parse(body); } catch { return {}; }
  }
  // Resend inbound은 application/x-www-form-urlencoded로도 올 수 있음
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(body)) params[k] = v;
  return params;
}

async function analyzeReply(text: string): Promise<{ hours: number; reason: string }> {
  const cleanText = text
    .replace(/<[^>]+>/g, ' ')  // HTML 태그 제거
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);

  if (!cleanText || !process.env.ANTHROPIC_API_KEY) {
    return { hours: DEFAULT_SNOOZE_H, reason: '답장 내용 없음' };
  }

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [
        { role: 'user', content: `${SNOOZE_RULES}\n\n답장 내용:\n"${cleanText}"` },
      ],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    const hours = Number(parsed.hours) || DEFAULT_SNOOZE_H;
    const reason = String(parsed.reason || '사유 분석 완료');
    return { hours, reason };
  } catch (err) {
    console.error('[email-reply] Claude 분석 실패:', err);
    return { hours: DEFAULT_SNOOZE_H, reason: '자동 분석 실패' };
  }
}
