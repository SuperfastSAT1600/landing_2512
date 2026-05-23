import { NextResponse } from 'next/server';

// Slack events endpoint — currently disabled
export async function POST() {
    return NextResponse.json({ ok: true });
}

export async function GET() {
    return NextResponse.json({ status: 'disabled' });
}
