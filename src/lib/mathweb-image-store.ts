import { supabaseAdmin } from '@/lib/supabase-admin';

const BUCKET = 'mathweb-images';

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/** REQ-005: Ensure public mathweb-images bucket exists (idempotent). */
export async function ensureMathlabBucket(): Promise<void> {
  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  if (error && !/exist/i.test(error.message)) {
    throw new Error(`mathweb bucket 생성 실패: ${error.message}`);
  }
}

/** REQ-013: Validate image file type and size. Throws on violation. */
export function validateImageFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new ValidationError(`허용되지 않는 파일 형식입니다: ${file.type}`);
  }
  if (file.size > MAX_BYTES) {
    throw new ValidationError(`파일 크기가 5MB를 초과합니다 (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
  }
}

export class ValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
}

/** Upload a single image and return its public URL. */
export async function uploadImage(
  problemId: string,
  slot: 'question' | 'answer',
  file: File
): Promise<string> {
  await ensureMathlabBucket();

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `problems/${problemId}/${slot}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) throw new Error(`이미지 업로드 실패: ${error.message}`);

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Delete all images under problems/{problemId}/. Best-effort (no throw). */
export async function deleteImages(problemId: string): Promise<void> {
  try {
    const { data } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(`problems/${problemId}`);
    if (!data?.length) return;
    const paths = data.map(f => `problems/${problemId}/${f.name}`);
    await supabaseAdmin.storage.from(BUCKET).remove(paths);
  } catch {
    // best-effort
  }
}
