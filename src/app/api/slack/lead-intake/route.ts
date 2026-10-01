import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { postSlack } from '@/app/api/slack/events/slack-utils';

async function postLeadConfirmation(
  channel: string,
  info: { name: string; inquiry_channel: string; traffic_source: string; lead_type: string; crmUrl: string },
): Promise<void> {
  const text = `✅ 리드 등록: ${info.name} | ${info.inquiry_channel} | ${info.traffic_source} | ${info.lead_type}`;
  // postSlack은 text 전용 — 블록 메시지는 Bot Token으로 직접 전송
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) { await postSlack(channel, text); return; }

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `✅ *리드 등록 완료*\n*이름:* ${info.name}\n*인입 채널:* ${info.inquiry_channel}\n*유입 소스:* ${info.traffic_source}\n*구분:* ${info.lead_type}`,
      },
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'CRM에서 보기 →' },
        url: info.crmUrl,
      },
    },
  ];

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel, text, blocks }),
  });
  const data = await res.json() as { ok: boolean; error?: string };
  if (!data.ok) console.error('[slack/lead-intake] postMessage 실패:', data.error);
}
import {
  INQUIRY_CHANNEL_OPTIONS,
  TRAFFIC_SOURCE_OPTIONS,
  type InquiryChannel,
  type TrafficSource,
  type LeadType,
} from '@/types/crm';

const LEAD_CHANNEL = 'C07FK85V9PD';

const CHANNEL_ABBR: Record<InquiryChannel, string> = {
  '카톡': '카톡',
  '네이버 상담시트': '네이버시트',
  '구글 상담시트': '구글시트',
  '전화': '전화',
  '상담 예약': '상담예약',
  '진단테스트 신청': '진단',
  '인스타그램 링크': '인스타',
};

export function generateLeadName(channel: InquiryChannel): string {
  const abbr = CHANNEL_ABBR[channel] ?? channel;
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const yyyymmdd = kst.getFullYear().toString()
    + String(kst.getMonth() + 1).padStart(2, '0')
    + String(kst.getDate()).padStart(2, '0');
  const hhmmss = String(kst.getHours()).padStart(2, '0')
    + String(kst.getMinutes()).padStart(2, '0')
    + String(kst.getSeconds()).padStart(2, '0');
  return `${abbr}_${yyyymmdd}_${hhmmss}`;
}

function toKSTNaive(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return kst.getFullYear() + '-'
    + String(kst.getMonth() + 1).padStart(2, '0') + '-'
    + String(kst.getDate()).padStart(2, '0') + 'T'
    + String(kst.getHours()).padStart(2, '0') + ':'
    + String(kst.getMinutes()).padStart(2, '0') + ':00';
}

export async function POST(request: NextRequest) {
  // REQ-003: 시크릿 토큰 검증
  const secret = process.env.SLACK_LEAD_INTAKE_SECRET;
  const token = request.headers.get('x-lead-intake-token');
  if (!secret || !token || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { inquiry_channel, traffic_source, lead_type, channel_id } = body;

  // REQ-005: 필드 유효성 검사
  if (!inquiry_channel) {
    return NextResponse.json({ error: 'inquiry_channel is required' }, { status: 400 });
  }
  if (!traffic_source) {
    return NextResponse.json({ error: 'traffic_source is required' }, { status: 400 });
  }
  if (!lead_type || (lead_type !== 'B2C' && lead_type !== 'B2B')) {
    return NextResponse.json({ error: 'lead_type must be B2C or B2B' }, { status: 400 });
  }
  if (!INQUIRY_CHANNEL_OPTIONS.includes(inquiry_channel as InquiryChannel)) {
    return NextResponse.json(
      { error: `inquiry_channel "${inquiry_channel}" is not a valid option` },
      { status: 400 },
    );
  }
  if (!TRAFFIC_SOURCE_OPTIONS.includes(traffic_source as TrafficSource)) {
    return NextResponse.json(
      { error: `traffic_source "${traffic_source}" is not a valid option` },
      { status: 400 },
    );
  }

  // REQ-002: 자동 이름 생성
  const name = generateLeadName(inquiry_channel as InquiryChannel);

  // REQ-001: DB 삽입
  const { data, error } = await supabaseAdmin
    .from('students')
    .insert([{
      name,
      grade: '기타',
      school_type: '한국 학제',
      parent_phone: '',
      inquiry_date: toKSTNaive(new Date().toISOString()),
      inquiry_channel: inquiry_channel as InquiryChannel,
      traffic_source: traffic_source as TrafficSource,
      lead_type: lead_type as LeadType,
      previous_score_status: 'never_taken',
      desired_subjects: 'Both',
      funnel_stage: '0',
      consultation_timeline: [],
      entered_by: 'slack-workflow',
    }])
    .select()
    .single();

  if (error) {
    console.error('[slack/lead-intake]', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }

  const student = data as { id: string; name: string };

  // REQ-004: Slack 확인 메시지
  const targetChannel = (typeof channel_id === 'string' && channel_id) ? channel_id : LEAD_CHANNEL;
  const crmUrl = 'https://tutoring.superfastsat.com/admin/crm';

  await postLeadConfirmation(targetChannel, {
    name: student.name,
    inquiry_channel: inquiry_channel as string,
    traffic_source: traffic_source as string,
    lead_type: lead_type as string,
    crmUrl,
  });

  return NextResponse.json({ ok: true, id: student.id, name: student.name }, { status: 201 });
}
