import { NextRequest, NextResponse } from 'next/server';
import { fetchOpenChecklists, markReminded } from '@/lib/assignment-checklist-store';
import { REMINDER_RECIPIENTS, buildReminderText, pickDueChecklists, sendDirectMessage } from '@/lib/assignment-checklist-reminder';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const due = pickDueChecklists(await fetchOpenChecklists(), now);
    if (due.length === 0) return NextResponse.json({ ok: true, reminded: 0 });

    const text = buildReminderText(due);
    for (const userId of REMINDER_RECIPIENTS) await sendDirectMessage(userId, text);
    await markReminded(due.map((r) => ({ channel: r.channel, message_ts: r.message_ts })), now);
    return NextResponse.json({ ok: true, reminded: due.length });
  } catch (err) {
    console.error('[assignment-checklist-reminder] 오류:', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
