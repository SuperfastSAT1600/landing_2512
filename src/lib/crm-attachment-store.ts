import { supabaseAdmin } from '@/lib/supabase-admin';
import { ATTACHMENT_BUCKET } from '@/lib/crm-attachment';

/** 비공개 첨부 버킷이 없으면 생성 (이미 있으면 무시). */
export async function ensureAttachmentBucket(): Promise<void> {
  const { error } = await supabaseAdmin.storage.createBucket(ATTACHMENT_BUCKET, { public: false });
  if (error && !/exist/i.test(error.message)) {
    throw new Error(`bucket 생성 실패: ${error.message}`);
  }
}
