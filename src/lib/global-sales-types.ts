/**
 * 글로벌 매출의 타입·상수 — 서버 의존이 없다.
 *
 * global-sales-service는 supabase-admin(서버 전용)을 import하므로 클라이언트 컴포넌트가
 * 값(상수)을 가져오면 번들에서 터진다. 그래서 순수 타입·상수만 이 파일로 갈라 둔다.
 */

export type GlobalSalePaymentType = '최초결제' | '재결제';
/** 결제 방식 — payment_type(최초/재결제)과 직교하는 축. 구독의 첫 달은 구독 + 최초결제다. */
export type GlobalSaleBillingType = '일회성' | '구독';

export const GLOBAL_SALE_PAYMENT_TYPES: GlobalSalePaymentType[] = ['최초결제', '재결제'];
export const GLOBAL_SALE_BILLING_TYPES: GlobalSaleBillingType[] = ['일회성', '구독'];

export interface GlobalSaleEntry {
  id: string;
  student_name: string;
  payment_type: GlobalSalePaymentType;
  amount_usd: number;
  sale_date: string; // YYYY-MM-DD
  country_code: string | null; // ISO 3166-1 alpha-2, NULL = 미지정
  billing_type: GlobalSaleBillingType;
  created_at: string;
}
