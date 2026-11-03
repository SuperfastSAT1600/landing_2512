import { NextRequest, NextResponse } from 'next/server';
import { fetchOpenChecklists, markReminded } from '@/lib/assignment-checklist-store';
import { buildReminderText, groupByRecipient, pickDueChecklists, recipientsOf, sendDirectMessage } from '@/lib/assignment-checklist-reminder';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const due = pickDueChecklists(await fetchOpenChecklists(), now);
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
