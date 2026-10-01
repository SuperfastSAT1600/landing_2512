import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'video/mp4'];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: { code: 'NO_FILE', message: '파일을 선택해주세요.' } }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: { code: 'INVALID_TYPE', message: 'JPG, PNG, HEIC, MP4 파일만 업로드 가능합니다.' } }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: { code: 'FILE_TOO_LARGE', message: '파일 크기는 50MB 이하여야 합니다.' } }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabaseAdmin.storage
    .from('mission-photos')
    .upload(fileName, arrayBuffer, { contentType: file.type, upsert: false });

  if (error) {
    console.error('[mission/upload]', error);
    return NextResponse.json({ error: { code: 'UPLOAD_ERROR', message: '업로드 중 오류가 발생했습니다.' } }, { status: 500 });
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('mission-photos')
    .getPublicUrl(fileName);

  return NextResponse.json({ data: { url: publicUrl } }, { status: 201 });
}
