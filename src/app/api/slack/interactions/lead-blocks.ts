import { INQUIRY_CHANNEL_OPTIONS, TRAFFIC_SOURCE_OPTIONS } from '@/types/crm';

type SlackOption = { text: { type: 'plain_text'; text: string }; value: string };

function toOptions(values: readonly string[]): SlackOption[] {
  return values.map(v => ({ text: { type: 'plain_text' as const, text: v }, value: v }));
}

export function buildLeadFormBlocks() {
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: '*새 리드 인입* — 아래에서 분류 후 등록해주세요.' },
    },
    {
      type: 'section',
      block_id: 'b_channel',
      text: { type: 'mrkdwn', text: '인입 채널' },
      accessory: {
        type: 'static_select',
        action_id: 'inquiry_channel',
        placeholder: { type: 'plain_text', text: '선택' },
        options: toOptions(INQUIRY_CHANNEL_OPTIONS),
      },
    },
    {
      type: 'section',
      block_id: 'b_source',
      text: { type: 'mrkdwn', text: '유입 소스' },
      accessory: {
        type: 'static_select',
        action_id: 'traffic_source',
        placeholder: { type: 'plain_text', text: '선택' },
        options: toOptions(TRAFFIC_SOURCE_OPTIONS),
      },
    },
    {
      type: 'section',
      block_id: 'b_type',
      text: { type: 'mrkdwn', text: '구분' },
      accessory: {
        type: 'static_select',
        action_id: 'lead_type',
        placeholder: { type: 'plain_text', text: '선택' },
        options: [
          { text: { type: 'plain_text' as const, text: 'B2C' }, value: 'B2C' },
          { text: { type: 'plain_text' as const, text: 'B2B' }, value: 'B2B' },
        ],
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          action_id: 'submit_lead',
          text: { type: 'plain_text', text: '리드 등록' },
          style: 'primary',
          value: 'submit',
        },
      ],
    },
  ];
}

export function buildLeadSuccessBlocks(name: string, channel: string, source: string, type: string) {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `✅ *리드 등록 완료*\n*이름:* ${name}\n*채널:* ${channel}  *소스:* ${source}  *구분:* ${type}`,
      },
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'CRM 보기 →' },
        url: 'https://tutoring.superfastsat.com/admin/crm',
      },
    },
  ];
}
