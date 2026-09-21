import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySlackRequest } from '@/app/api/slack/events/slack-utils';
import { generateLeadName } from '@/app/api/slack/lead-intake/route';
import { buildLeadSuccessBlocks } from './lead-blocks';
import type { InquiryChannel, TrafficSource, LeadType } from '@/types/crm';

export const runtime = 'nodejs';

type SelectedOption = { value: string } | null;
type StateValues = {
  b_channel?: { inquiry_channel?: { selected_option: SelectedOption } };
  b_source?: { traffic_source?: { selected_option: SelectedOption } };
  b_type?: { lead_type?: { selected_option: SelectedOption } };
};

type BlockActionsPayload = {
  type: string;
  actions: { action_id: string }[];
  channel: { id: string };
  message: { ts: string };
  response_url: string;
  state: { values: StateValues };
};

function toKSTNaive(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return kst.getFullYear() + '-'
    + String(kst.getMonth() + 1).padStart(2, '0') + '-'
    + String(kst.getDate()).padStart(2, '0') + 'T'
    + String(kst.getHours()).padStart(2, '0') + ':'
    + String(kst.getMinutes()).padStart(2, '0') + ':00';
}

async function updateMessage(
  channelId: string,
  ts: string,
  blocks: unknown[],
  text: string,
): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return;
  const res = await fetch('https://slack.com/api/chat.update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel: channelId, ts, text, blocks }),
  });
  const data = await res.json() as { ok: boolean; error?: string };
  if (!data.ok) console.error('[slack/interactions] chat.update 실패:', data.error);
}

async function postEphemeral(responseUrl: string, text: string): Promise<void> {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response_type: 'ephemeral', replace_original: false, text }),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  // REQ-003: Slack 서명 검증
  if (!(await verifySlackRequest(request, body))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const raw = new URLSearchParams(body).get('payload');
  if (!raw) return NextResponse.json({ ok: true });

  const payload = JSON.parse(raw) as BlockActionsPayload;

  // 드롭다운 변경 이벤트는 무시 (버튼 클릭만 처리)
  if (payload.type !== 'block_actions') return NextResponse.json({ ok: true });
  const action = payload.actions[0];
  if (!action || action.action_id !== 'submit_lead') return NextResponse.json({ ok: true });

  // REQ-006: 미선택 방어
  const vals = payload.state?.values ?? {};
  const inquiryChannel = vals.b_channel?.inquiry_channel?.selected_option?.value;
  const trafficSource = vals.b_source?.traffic_source?.selected_option?.value;
  const leadType = vals.b_type?.lead_type?.selected_option?.value;

  if (!inquiryChannel || !trafficSource || !leadType) {
    await postEphemeral(payload.response_url, '인입 채널, 유입 소스, 구분을 모두 선택해주세요.');
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  // REQ-005: 자동 이름 생성
  const name = generateLeadName(inquiryChannel as InquiryChannel);

  // REQ-004: DB 삽입
  const { data, error } = await supabaseAdmin
    .from('students')
    .insert([{
      name,
      grade: '기타',
      school_type: '한국 학제',
      parent_phone: '',
      inquiry_date: toKSTNaive(new Date().toISOString()),
      inquiry_channel: inquiryChannel as InquiryChannel,
      traffic_source: trafficSource as TrafficSource,
      lead_type: leadType as LeadType,
      previous_score_status: 'never_taken',
      desired_subjects: 'Both',
      funnel_stage: '0',
      consultation_timeline: [],
      entered_by: 'slack-screenshot',
    }])
    .select()
    .single();

  if (error) {
    console.error('[slack/interactions]', error);
    await postEphemeral(payload.response_url, '등록 중 오류가 발생했습니다. 다시 시도해주세요.');
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }

  const student = data as { id: string; name: string };

  // 카드를 완료 상태로 업데이트
  const successBlocks = buildLeadSuccessBlocks(student.name, inquiryChannel, trafficSource, leadType);
  await updateMessage(
    payload.channel.id,
    payload.message.ts,
    successBlocks,
    `✅ 리드 등록 완료: ${student.name}`,
  );

  return NextResponse.json({ ok: true });
}
