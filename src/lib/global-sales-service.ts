/**
 * 글로벌(USD) 매출 조회 — 튜터링(CRM students/payments)과 무관한 별도 상품 라인.
 *
 * 라우트(/api/business/global-sales)와 크론(/api/cron/weekly-business-report)이 함께 쓴다.
 * 크론이 HTTP 대신 이 모듈을 직접 부르는 이유는 @/lib/crm-stats-service 주석 참고.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';

export type GlobalSalePaymentType = '최초결제' | '재결제';

export interface GlobalSaleEntry {
  id: string;
  student_name: string;
  payment_type: GlobalSalePaymentType;
  amount_usd: number;
  sale_date: string; // YYYY-MM-DD
  country_code: string | null; // ISO 3166-1 alpha-2, NULL = 미지정
  created_at: string;
}

export const GLOBAL_SALE_PAYMENT_TYPES: GlobalSalePaymentType[] = ['최초결제', '재결제'];

export type GlobalSalesResult =
  | { ok: true; data: GlobalSaleEntry[] }
  | { ok: false; message: string };

/** 전체 글로벌 매출 이력(판매일 내림차순). 날짜 필터는 호출자가 건다. */
export async function listGlobalSales(): Promise<GlobalSalesResult> {
  const { data, error } = await supabaseAdmin
    .from('global_sales')
    .select('*')
    .order('sale_date', { ascending: false });

  if (error) {
    console.error('[global-sales] 조회 실패:', error.message);
    return { ok: false, message: error.message };
  }

  return { ok: true, data: (data ?? []) as GlobalSaleEntry[] };
}
