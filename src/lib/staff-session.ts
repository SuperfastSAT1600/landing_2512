// 직원 세션 — SFv2 staff·admin 계정으로 로그인한 직원의 서명 쿠키. 서버 전용.
import { createHmac, timingSafeEqual } from 'crypto';

export const STAFF_SESSION_COOKIE = 'staff_session';
// 업무일 단위로 쓰는 내부 직원 도구라 8시간 (고객용 세션의 15~30분 기준과 다르다)
export const STAFF_SESSION_TTL_SECONDS = 8 * 60 * 60;

export type StaffRole = 'staff' | 'admin';

export interface StaffUser {
  id: string;
  name: string;
  role: StaffRole;
}

interface TokenBody extends StaffUser {
  exp: number;
}

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return role === 'staff' || role === 'admin';
}

function secret(): string {
  const value = process.env.STAFF_SESSION_SECRET || process.env.ADMIN_SECRET_KEY;
  if (!value) throw new Error('STAFF_SESSION_SECRET (or ADMIN_SECRET_KEY) is not set');
  return value;
}

const sign = (body: string): string => createHmac('sha256', secret()).update(`staff-session.${body}`).digest('base64url');

export function createStaffSessionToken(user: StaffUser): string {
  const payload: TokenBody = { ...user, exp: Math.floor(Date.now() / 1000) + STAFF_SESSION_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifyStaffSessionToken(token: string | undefined | null): StaffUser | null {
  if (!token) return null;
  const [body, signature, ...rest] = token.split('.');
  if (!body || !signature || rest.length) return null;

  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenBody;
    if (typeof parsed.exp !== 'number' || parsed.exp * 1000 < Date.now()) return null;
    if (!parsed.id || !parsed.name || !isStaffRole(parsed.role)) return null;
    return { id: parsed.id, name: parsed.name, role: parsed.role };
  } catch {
    return null;
  }
}
