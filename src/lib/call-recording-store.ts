import { supabaseAdmin } from '@/lib/supabase-admin';
import { CALL_BUCKET } from '@/lib/call-recording';

/** 비공개 버킷이 없으면 생성 (이미 있으면 무시). */
export async function ensureCallBucket(): Promise<void> {
  const { error } = await supabaseAdmin.storage.createBucket(CALL_BUCKET, { public: false });
  if (error && !/exist/i.test(error.message)) {
    throw new Error(`bucket 생성 실패: ${error.message}`);
  }
}

/**
 * 보관 기간(expires_at)이 지난 원본 오디오를 Storage에서 삭제하고 행을 purged 처리.
 * 관리자 수동 cleanup·cron이 공유한다.
 * @returns 삭제 처리된 녹음 수
 */
export async function purgeExpiredRecordings(): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data: expired, error } = await supabaseAdmin
    .from('call_recordings')
    .select('id, storage_path')
    .is('purged_at', null)
    .lte('expires_at', nowIso)
    .limit(1000);

  if (error) throw new Error(`조회 실패: ${error.message}`);
  if (!expired?.length) return 0;

  // storage_path는 세그먼트 경로 콤마 결합 — 모두 펼쳐 삭제
  const paths = expired.flatMap((r) => String(r.storage_path).split(',').filter(Boolean));
  if (paths.length > 0) {
    const { error: rmErr } = await supabaseAdmin.storage.from(CALL_BUCKET).remove(paths);
    if (rmErr) throw new Error(`삭제 실패: ${rmErr.message}`);
  }

  const ids = expired.map((r) => r.id);
  await supabaseAdmin
    .from('call_recordings')
    .update({ status: 'purged', purged_at: nowIso })
    .in('id', ids);

  return ids.length;
}
