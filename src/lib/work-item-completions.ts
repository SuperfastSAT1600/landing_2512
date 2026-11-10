// 할 일 완료(✅) 시각 저장소. Slack 은 반응 시각을 돌려주지 않아 반응 이벤트로 기록한다. 서버 전용.
import { supabaseAdmin } from '@/lib/supabase-admin';
import { DONE_REACTION, WORK_CHANNEL } from '@/lib/work-log';

const TABLE = 'work_item_completions';

export interface ReactionEvent {
  type: string;
  user?: string;
  reaction?: string;
  item?: { type?: string; channel?: string; ts?: string };
  event_ts?: string;
}

export function isDoneReactionEvent(event: ReactionEvent): boolean {
  return (event.type === 'reaction_added' || event.type === 'reaction_removed')
    && event.reaction === DONE_REACTION
    && event.item?.type === 'message'
    && event.item.channel === WORK_CHANNEL;
}

async function hasDoneReaction(messageTs: string): Promise<boolean> {
  const params = new URLSearchParams({ channel: WORK_CHANNEL, timestamp: messageTs });
  const res = await fetch(`https://slack.com/api/reactions.get?${params}`, {
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string; message?: { reactions?: { name: string }[] } };
  if (!data.ok) throw new Error(`Slack reactions.get: ${data.error}`);
  return Boolean(data.message?.reactions?.some((r) => r.name === DONE_REACTION));
}

/** ✅ 추가는 처음 시각만 남기고(재전송·중복 무시), 제거는 ✅ 가 하나도 남지 않을 때만 기록을 지운다 */
export async function handleDoneReaction(event: ReactionEvent): Promise<void> {
  const messageTs = event.item!.ts!;
  if (event.type === 'reaction_added') {
    const { error } = await supabaseAdmin.from(TABLE).upsert(
      { channel: WORK_CHANNEL, message_ts: messageTs, done_at: new Date(Number(event.event_ts) * 1000).toISOString(), done_by: event.user ?? '' },
      { onConflict: 'channel,message_ts', ignoreDuplicates: true },
    );
    if (error) throw new Error(`${TABLE} record: ${error.message}`);
    return;
  }
  if (await hasDoneReaction(messageTs)) return;
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('channel', WORK_CHANNEL).eq('message_ts', messageTs);
  if (error) throw new Error(`${TABLE} clear: ${error.message}`);
}

/** message_ts → 완료 시각(ISO) */
export async function listCompletions(): Promise<Record<string, string>> {
  const { data, error } = await supabaseAdmin.from(TABLE).select('message_ts, done_at').eq('channel', WORK_CHANNEL);
  if (error) throw new Error(`${TABLE} list: ${error.message}`);
  return Object.fromEntries((data ?? []).map((r) => [r.message_ts, new Date(r.done_at).toISOString()]));
}
