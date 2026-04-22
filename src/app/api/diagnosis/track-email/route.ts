import { NextRequest, NextResponse } from 'next/server';
import { sendMetaCAPIEvent } from '@/lib/meta-capi';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    sendMetaCAPIEvent({
      eventName: 'Lead',
      userData: { em: email.toLowerCase().trim() },
      customData: {
        content_name: 'diagnosis_email',
        currency: 'KRW',
        value: 0,
      },
    }).catch(err => console.error('[track-email] CAPI error:', err));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
