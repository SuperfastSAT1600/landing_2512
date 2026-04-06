import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyExpiredTokens, ExpiredTokenData } from '@/lib/slack';

/**
 * GET /api/cron/diagnosis-expiry
 * Vercel Cron Job — runs daily at 09:00 KST (00:00 UTC)
 *
 * Finds tokens that:
 *   1. Expired within the last 24 hours
 *   2. Have no submitted result
 *   3. Have not yet been Slack-notified (slack_notified_at IS NULL)
 *
 * Sends a single Slack message listing all affected tokens,
 * then marks them as notified to prevent duplicate alerts.
 */
export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const nowISO = now.toISOString();

    // 1. Fetch expired, un-notified tokens
    const { data: expiredTokens, error: fetchError } = await supabaseAdmin
      .from('diagnostic_access_tokens')
      .select('id, token, student_name, student_email, expires_at')
      .eq('is_active', true)
      .is('slack_notified_at', null)
      .gte('expires_at', oneDayAgo)   // expired within last 24h
      .lte('expires_at', nowISO);     // already expired (not future)

    if (fetchError) {
      console.error('[cron/diagnosis-expiry] fetch error:', fetchError);
      return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 });
    }

    if (!expiredTokens || expiredTokens.length === 0) {
      return NextResponse.json({ notified: 0, message: 'No expired tokens to notify' });
    }

    // 2. Filter out tokens that already have a submitted result
    const tokenIds = expiredTokens.map((t) => t.id);
    const { data: results } = await supabaseAdmin
      .from('diagnostic_test_results')
      .select('token_id')
      .in('token_id', tokenIds);

    const submittedTokenIds = new Set((results ?? []).map((r) => r.token_id));
    const unsubmitted = expiredTokens.filter((t) => !submittedTokenIds.has(t.id));

    if (unsubmitted.length === 0) {
      return NextResponse.json({ notified: 0, message: 'All expired tokens have submissions' });
    }

    // 3. Send Slack notification
    const slackData: ExpiredTokenData[] = unsubmitted.map((t) => ({
      id: t.id,
      token: t.token,
      studentName: t.student_name,
      studentEmail: t.student_email,
      expiresAt: t.expires_at,
    }));

    await notifyExpiredTokens(slackData);

    // 4. Mark as notified (prevents duplicate alerts on next cron run)
    const notifiedIds = unsubmitted.map((t) => t.id);
    const { error: updateError } = await supabaseAdmin
      .from('diagnostic_access_tokens')
      .update({ slack_notified_at: nowISO })
      .in('id', notifiedIds)
      .is('slack_notified_at', null); // extra guard against race conditions

    if (updateError) {
      console.error('[cron/diagnosis-expiry] update error:', updateError);
      // Not fatal — Slack message was already sent
    }

    return NextResponse.json({ notified: unsubmitted.length });
  } catch (error) {
    console.error('[cron/diagnosis-expiry] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
