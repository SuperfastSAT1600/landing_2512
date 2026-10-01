/**
 * CRM 일회성 조회 공통 모듈 — READ ONLY.
 *
 * 캠페인 후보 추출 스크립트들이 공유한다(컨설팅 소개, AP 수업권, …).
 * `src/lib/supabase-admin`은 static import 시 dotenv보다 먼저 평가돼 죽으므로
 * 여기서 createClient를 직접 호출한다.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const FETCH_PAGE = 500; // Supabase 요청당 1000행 하드 캡 회피
const PAYMENT_CHUNK = 150;
const DEFAULT_COOLDOWN_DAYS = 30;

export function loadEnv(): void {
  for (const line of readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
}

export function client(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/** 스키마 드리프트가 있는 저장소다(콘솔 수동 추가 컬럼 존재). 기대 컬럼을 먼저 확인한다. */
export async function assertColumns(sb: SupabaseClient, columns: string): Promise<void> {
  const { data, error } = await sb.from('students').select(columns).limit(1);
  if (error) throw new Error(`students 컬럼 확인 실패: ${error.message}`);
  if (!data?.length) throw new Error('students 테이블이 비어 있다');
  const missing = columns.split(', ').filter(c => !(c in (data[0] as object)));
  if (missing.length) throw new Error(`students에 없는 컬럼: ${missing.join(', ')}`);
}

export async function fetchAllStudents<T>(sb: SupabaseClient, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += FETCH_PAGE) {
    const { data, error } = await sb
      .from('students').select(columns).order('id').range(from, from + FETCH_PAGE - 1);
    if (error) throw new Error(`students 조회 실패: ${error.message}`);
    if (!data?.length) break;
    rows.push(...(data as unknown as T[]));
    if (data.length < FETCH_PAGE) break;
  }
  return rows;
}

export interface PaymentSummary {
  net: number;
  renewalCount: number;
  lastPaidAt: string | null;
  categories: string[];
}

/**
 * 학생별 결제 집계. amount는 0(가결제)과 음수(환불)가 존재하고 payment_type='환불'도
 * 따로 있어, 두 인코딩을 모두 차감으로 처리한다.
 */
export async function fetchPayments(sb: SupabaseClient, ids: string[]) {
  const byStudent = new Map<string, PaymentSummary>();
  let unattributed = 0;

  for (let i = 0; i < ids.length; i += PAYMENT_CHUNK) {
    const { data, error } = await sb
      .from('payments')
      .select('student_id, amount, payment_type, product_category, paid_at')
      .in('student_id', ids.slice(i, i + PAYMENT_CHUNK));
    if (error) throw new Error(`payments 조회 실패: ${error.message}`);

    for (const p of (data ?? []) as Array<{
      student_id: string | null; amount: number | null; payment_type: string | null;
      product_category: string | null; paid_at: string | null;
    }>) {
      if (!p.student_id) { unattributed++; continue; }
      const cur = byStudent.get(p.student_id)
        ?? { net: 0, renewalCount: 0, lastPaidAt: null, categories: [] };
      const amt = p.amount ?? 0;
      cur.net += p.payment_type === '환불' ? -Math.abs(amt) : amt;
      if (p.payment_type === '재결제') cur.renewalCount++;
      if (p.payment_type !== '환불' && amt > 0 && p.paid_at) {
        if (!cur.lastPaidAt || p.paid_at > cur.lastPaidAt) cur.lastPaidAt = p.paid_at;
      }
      if (p.product_category && !cur.categories.includes(p.product_category)) {
        cur.categories.push(p.product_category);
      }
      byStudent.set(p.student_id, cur);
    }
  }
  return { byStudent, unattributed };
}

/** 최근 윈백 발송 + 재결제 파이프라인에 열려 있는 학생 — 중복 컨택 방지. */
export async function fetchCampaignExclusions(
  sb: SupabaseClient,
  now: number,
  cooldownDays = DEFAULT_COOLDOWN_DAYS
): Promise<Set<string>> {
  const excluded = new Set<string>();
  const since = new Date(now - cooldownDays * 86400_000).toISOString();

  const wb = await sb.from('winback_targets').select('student_id').gte('sent_at', since);
  if (wb.error) throw new Error(`winback_targets 조회 실패: ${wb.error.message}`);
  for (const r of wb.data ?? []) excluded.add((r as { student_id: string }).student_id);

  const rt = await sb.from('renewal_targets').select('student_id').in('stage', ['1', '2', '3']);
  if (rt.error) throw new Error(`renewal_targets 조회 실패: ${rt.error.message}`);
  for (const r of rt.data ?? []) excluded.add((r as { student_id: string }).student_id);

  return excluded;
}

/** 미전환 사유 메모 — 제외하지 않고 비고로 표시해 사람이 보게 한다. */
export async function fetchDropReasons(sb: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await sb
    .from('renewal_targets').select('student_id, drop_reason').eq('stage', '5');
  if (error) throw new Error(`renewal_targets(미전환) 조회 실패: ${error.message}`);
  const notes = new Map<string, string>();
  for (const r of (data ?? []) as Array<{ student_id: string; drop_reason: string | null }>) {
    if (r.drop_reason) notes.set(r.student_id, `재결제 미전환: ${r.drop_reason}`);
  }
  return notes;
}

export function lastMemoDate(
  timeline: Array<{ created_at?: string }> | null | undefined
): string {
  const dates = (timeline ?? []).map(e => e.created_at ?? '').filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1].slice(0, 10) : '';
}
