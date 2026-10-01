import { NextResponse } from 'next/server';
import { sendSlackLeadMessage, buildLeadSlackBlocks } from '@/lib/meta-lead-webhook';

const SLACK_LEADS_CHANNEL_ID = 'C07FK85V9PD';

/**
 * POST /api/admin/test-lead-slack
 * 프로덕션 환경에서 Meta 리드 슬랙 알림 연결 상태 확인용 테스트 엔드포인트
 */
export async function POST() {
  const botToken = process.env.SLACK_BOT_TOKEN;
  const webhookUrl = process.env.SLACK_LEADS_WEBHOOK_URL;

  if (!botToken && !webhookUrl) {
    return NextResponse.json({ ok: false, error: 'SLACK_BOT_TOKEN 과 SLACK_LEADS_WEBHOOK_URL 모두 미설정' }, { status: 500 });
  }

  const mockLeadData = {
    id: 'test-lead-id',
    created_time: new Date().toISOString(),
    field_data: [
      { name: 'full_name', values: ['[테스트] 홍길동'] },
      { name: 'phone_number', values: ['01000000000'] },
    ],
    ad_name: '[테스트] 진단테스트 광고',
    campaign_name: '[테스트] 가을학기 캠페인',
  };

  try {
    const { text, blocks } = buildLeadSlackBlocks({
      leadData: mockLeadData,
      localTz: 'Asia/Seoul',
      labels: new Map(),
      adsetName: '[테스트] 광고세트',
      existingStudentId: null,
    });

    await sendSlackLeadMessage({
      text,
      blocks,
      botToken,
      channelId: SLACK_LEADS_CHANNEL_ID,
      webhookUrl,
    });

    return NextResponse.json({
      ok: true,
      message: '슬랙 전송 성공',
      usedBotToken: !!botToken,
      usedWebhook: !!webhookUrl,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
