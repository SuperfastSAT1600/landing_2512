/**
 * 현재 로그인한 CRM 담당자명을 가져온다 (클라이언트 전용).
 * 로그인 시 useAdminAuth가 localStorage에 저장한 값.
 */
export function getAdminUserName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_user_name') || '';
}

/**
 * CRM 담당자(세일즈) 명단 — 결제 담당자 수동 지정 드롭다운 등에 사용.
 * 로그인 코드 매핑(api/admin/auth)과 이름이 일치해야 한다.
 */
export const CRM_MEMBER_NAMES = ['이민재', '김우영', '김남준', '김재연', '배병윤'] as const;

/**
 * 공용 비번 로그인은 userName='관리자'로 잡히는데, 실제 사용자는 배병윤이므로
 * 결제 담당자 귀속 시 '관리자' → '배병윤'으로 매핑한다.
 */
const PAYMENT_OWNER_ALIAS: Record<string, string> = { 관리자: '배병윤' };

/** 결제 담당자(created_by)로 기록할 이름. 공용 비번(관리자)은 배병윤으로 귀속. */
export function getPaymentOwnerName(): string {
  const name = getAdminUserName();
  return PAYMENT_OWNER_ALIAS[name] ?? name;
}
