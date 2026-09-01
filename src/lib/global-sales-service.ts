/**
 * 글로벌(USD) 매출 조회 — 튜터링(CRM students/payments)과 무관한 별도 상품 라인.
 *
 * 라우트(/api/business/global-sales)와 크론(/api/cron/weekly-business-report)이 함께 쓴다.
 * 크론이 HTTP 대신 이 모듈을 직접 부르는 이유는 @/lib/crm-stats-service 주석 참고.
 *
 * 타입·상수는 @/lib/global-sales-types 에 있다 — 이 파일은 supabase-admin(서버 전용)을
 * 끌어오므로 클라이언트가 값을 가져가면 번들에서 터진다.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { GlobalSaleEntry } from './global-sales-types';

export type {
  GlobalSaleEntry,
  GlobalSalePaymentType,
  GlobalSaleBillingType,
} from './global-sales-types';
export { GLOBAL_SALE_PAYMENT_TYPES, GLOBAL_SALE_BILLING_TYPES } from './global-sales-types';

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

  // billing_type은 마이그레이션 122로 생긴 NOT NULL 컬럼이다. 배포가 마이그레이션보다
  // 먼저 나가는 구간에서만 값이 비는데, 그때 화면이 깨지지 않도록 읽기 경계에서 채운다.
  const rows = (data ?? []) as GlobalSaleEntry[];
  return {
    ok: true,
    data: rows.map((row) => ({ ...row, billing_type: row.billing_type ?? '일회성' })),
  };
}
