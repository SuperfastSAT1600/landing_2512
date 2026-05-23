import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN!;
const TARGET_CHANNEL_ID = 'C0B5SKL75FU';
const TARGET_USER_ID = 'U07FK6LSK7C';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    const body = await request.json();

    // Slack URL verification challenge
    if (body.type === 'url_verification') {
        return NextResponse.json({ challenge: body.challenge });
    }

    // Only handle message events from the target channel and user
    const event = body.event;
    if (
        body.type !== 'event_callback' ||
        event?.type !== 'message' ||
        event?.subtype || // skip bot messages, edits, etc.
        event?.channel !== TARGET_CHANNEL_ID ||
        event?.user !== TARGET_USER_ID ||
        event?.bot_id // skip bot messages
    ) {
        return NextResponse.json({ ok: true });
    }

    // Store the command in Supabase
    const { error } = await supabase.from('slack_commands').insert({
        channel_id: event.channel,
        user_id: event.user,
        text: event.text,
        ts: event.ts,
        status: 'pending',
    });

    if (error) {
        // Ignore duplicate ts (already stored)
        if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
            console.error('Failed to store slack command:', error);
        }
    }

    return NextResponse.json({ ok: true });
}

// Allow Slack to verify the endpoint
export async function GET() {
    return NextResponse.json({ status: 'Slack events endpoint active' });
}
