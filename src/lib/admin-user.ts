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
