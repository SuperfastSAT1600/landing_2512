const PIXEL_ID = '1211644187821856';

async function hashSHA256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

interface PixelUserData {
  em?: string;
  ph?: string;
  fn?: string;
}

export async function setPixelAdvancedMatching(userData: PixelUserData): Promise<void> {
  if (typeof window === 'undefined' || !window.fbq) return;

  const hashed: Record<string, string> = {};

  if (userData.em) {
    hashed.em = await hashSHA256(userData.em.toLowerCase().trim());
  }
  if (userData.ph) {
    hashed.ph = await hashSHA256(userData.ph.replace(/\D/g, ''));
  }
  if (userData.fn) {
    hashed.fn = await hashSHA256(userData.fn.toLowerCase().trim());
  }

  window.fbq('init', PIXEL_ID, hashed);
}
