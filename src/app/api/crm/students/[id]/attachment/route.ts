import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import {
  ATTACHMENT_BUCKET, isAllowedAttachmentMime, MAX_ATTACHMENT_BYTES, SIGNED_URL_TTL_SEC,
  isWithinStudentFolder,
} from '@/lib/crm-attachment';
import { ensureAttachmentBucket } from '@/lib/crm-attachment-store';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

/**
 * POST /api/crm/students/[id]/attachment
 * 상담 메모 첨부(이미지/PDF) 1개를 비공개 버킷에 업로드한다.
 * multipart: file. 메모는 변경하지 않음 — 클라이언트가 staged 후 메모 저장 시 함께 전송.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) return err('UNAUTHORIZED', '인증이 필요합니다.', 401);

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get('file');
    file = f instanceof File ? f : null;
  } catch {
    return err('INVALID_FORM', '잘못된 요청 형식입니다.', 400);
  }

  if (!file) return err('NO_FILE', '파일이 없습니다.', 400);
  if (!isAllowedAttachmentMime(file.type)) {
    return err('BAD_MIME', `지원하지 않는 형식입니다: ${file.type || '알 수 없음'}`, 400);
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return err('TOO_LARGE', '파일이 너무 큽니다(최대 10MB).', 400);
  }

  const { data: student, error: studentErr } = await supabaseAdmin
    .from('students').select('id').eq('id', id).single();
  if (studentErr || !student) return err('STUDENT_NOT_FOUND', '학생을 찾을 수 없습니다.', 404);

  const baseMime = file.type.split(';')[0].trim();
  const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 80);
  const path = `${id}/${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;

  try {
    await ensureAttachmentBucket();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabaseAdmin.storage
      .from(ATTACHMENT_BUCKET).upload(path, buffer, { contentType: baseMime, upsert: false });
    if (upErr) throw new Error(upErr.message);
  } catch (e) {
    console.error('[crm/attachment POST]', e);
    return err('UPLOAD_FAILED', '첨부 저장에 실패했습니다.', 500);
  }

  return NextResponse.json(
    { data: { path, name: file.name || safeName, mime: baseMime, size: file.size } },
    { status: 201 }
  );
}

/**
 * GET /api/crm/students/[id]/attachment?path=<path>
 * 비공개 첨부에 대한 단기 서명 URL을 반환한다.
 * path가 해당 학생 폴더(`${id}/`) 안에 있는지 검증해 다른 학생 파일 접근/경로 탈출을 막는다.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) return err('UNAUTHORIZED', '인증이 필요합니다.', 401);

  const path = request.nextUrl.searchParams.get('path') ?? '';
  if (!isWithinStudentFolder(path, id)) {
    return err('FORBIDDEN', '잘못된 첨부 경로입니다.', 403);
  }

  const { data, error } = await supabaseAdmin.storage
    .from(ATTACHMENT_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) {
    return err('SIGN_FAILED', '첨부를 불러오지 못했습니다.', 404);
  }

  return NextResponse.json({ data: { url: data.signedUrl } });
}
