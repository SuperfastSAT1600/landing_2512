import crypto from 'crypto';

function hashSHA256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

interface MetaCAPIEventData {
  eventName: string;
  userData: {
    ph?: string;
    em?: string;
    fn?: string;
  };
  customData?: Record<string, unknown>;
}

export async function sendMetaCAPIEvent({ eventName, userData, customData }: MetaCAPIEventData) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn('[CAPI] Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN — skipping');
    return;
  }

  const eventId = crypto.randomUUID();
  const hashedUserData: Record<string, string> = {};

  if (userData.ph) hashedUserData.ph = hashSHA256(normalizePhone(userData.ph));
  if (userData.em) hashedUserData.em = hashSHA256(userData.em.toLowerCase().trim());
  if (userData.fn) hashedUserData.fn = hashSHA256(userData.fn.toLowerCase().trim());

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [{
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            action_source: 'website',
            user_data: hashedUserData,
            custom_data: customData ?? {},
          }],
          access_token: accessToken,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[CAPI] Send failed:', err);
    }
  } catch (err) {
    console.error('[CAPI] Network error:', err);
  }

  return eventId;
}
