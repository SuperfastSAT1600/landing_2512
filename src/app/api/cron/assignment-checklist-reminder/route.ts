import { NextRequest, NextResponse } from 'next/server';
import { fetchOpenChecklists, markReminded, saveChecked } from '@/lib/assignment-checklist-store';
import { buildReminderText, groupByRecipient, pickDueChecklists, recipientsOf, sendDirectMessage, type OpenChecklist } from '@/lib/assignment-checklist-reminder';
import { fetchLiveChecklist } from '@/lib/slack-assignment-checklist';

/** Slack 의 현재 상태를 반영한 행. 다 체크됐거나 요청 글에 완료 이모지가 달렸거나 글이 지워졌으면 닫고 null. 조회 실패 시에는 DB 기준으로 알린다 */
async function refresh(row: OpenChecklist): Promise<OpenChecklist | null> {
  let live;
  try {
    live = await fetchLiveChecklist(row.channel, row.message_ts);
  } catch (err) {
    console.error(`[assignment-checklist-reminder] ${row.message_ts} 조회 실패:`, err);
    return row;
  }
  if (live && !live.requestDone && live.checkedIds.length < live.total) return { ...row, checked_ids: live.checkedIds };
  await saveChecked(row.channel, row.message_ts, live?.checkedIds ?? row.checked_ids, true)
    .catch((err) => console.error(`[assignment-checklist-reminder] ${row.message_ts} 닫기 실패:`, err));
  return null;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const refreshed = await Promise.all(pickDueChecklists(await fetchOpenChecklists(), now).map(refresh));
    const due = refreshed.filter((r): r is OpenChecklist => r !== null);
    if (due.length === 0) return NextResponse.json({ ok: true, reminded: 0 });

    // 한 수신자의 전송 실패가 다른 수신자 DM 을 막지 않게 하고, 수신자 전원에게 간 건만 알림 시각을 갱신한다
    const failed = new Set<string>();
    for (const [userId, rows] of groupByRecipient(due)) {
      try {
        await sendDirectMessage(userId, buildReminderText(rows));
      } catch (err) {
        failed.add(userId);
        console.error(`[assignment-checklist-reminder] ${userId} DM 실패:`, err);
      }
    }
    const delivered = due.filter((r) => recipientsOf(r).every((id) => !failed.has(id)));
    if (delivered.length > 0) await markReminded(delivered.map((r) => ({ channel: r.channel, message_ts: r.message_ts })), now);
    return NextResponse.json({ ok: true, reminded: delivered.length });
  } catch (err) {
    console.error('[assignment-checklist-reminder] 오류:', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
