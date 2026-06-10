import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { transcribeAndSummarizeCall } from '@/lib/call-transcribe';
import { ALLOWED_AUDIO_MIME, MAX_AUDIO_BYTES, computeExpiresAt } from '@/lib/call-recording';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
// 전사+요약은 통화 길이에 따라 수십 초 걸릴 수 있어 여유를 둔다.
export const maxDuration = 300;

const BUCKET = 'call-recordings';

const EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

/** 비공개 버킷이 없으면 생성 (이미 있으면 무시). */
async function ensureBucket(): Promise<void> {
  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, { public: false });
  // 이미 존재하면 에러 코드가 오는데 정상 흐름이므로 무시
  if (error && !/exist/i.test(error.message)) {
    throw new Error(`bucket 생성 실패: ${error.message}`);
  }
}

/**
 * POST /api/crm/students/[id]/call-recording
 * 통화 오디오(multipart: file)를 받아 비공개 저장 + 전사·요약 후 상담 메모 초안을 반환한다.
 * (자동 저장하지 않음 — 상담사가 메모란에서 검토 후 "메모 저장"으로 확정)
 */
export async function POST(
  request: NextRequest,
  { params: _pid }: { params: Promise<{ id: string }> }
) {
  const { id } = await _pid;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, { status: 401 });
  }

  let file: File | null = null;
  let durationSec: number | null = null;
  try {
    const form = await request.formData();
    file = form.get('file') as File | null;
    const d = form.get('duration');
    durationSec = d ? Math.round(Number(d)) || null : null;
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_FORM', message: '잘못된 요청 형식입니다.' } }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: { code: 'NO_FILE', message: '오디오 파일이 없습니다.' } }, { status: 400 });
  }
  const baseMime = file.type.split(';')[0].trim();
  if (!ALLOWED_AUDIO_MIME.has(baseMime)) {
    return NextResponse.json({ error: { code: 'BAD_MIME', message: `지원하지 않는 오디오 형식입니다: ${file.type}` } }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: { code: 'TOO_LARGE', message: '녹음 파일이 너무 큽니다(최대 20MB). 통화를 나눠 녹음해주세요.' } }, { status: 400 });
  }

  // 학생 존재 확인
  const { data: student, error: studentErr } = await supabaseAdmin
    .from('students').select('id').eq('id', id).single();
  if (studentErr || !student) {
    return NextResponse.json({ error: { code: 'STUDENT_NOT_FOUND', message: '학생을 찾을 수 없습니다.' } }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = EXT[baseMime] ?? 'bin';
  const storagePath = `${id}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  // 저장 (실패해도 전사는 진행할 수 있게 분리하되, 저장 실패는 보관 정책상 에러로 본다)
  try {
    await ensureBucket();
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET).upload(storagePath, buffer, { contentType: baseMime, upsert: false });
    if (upErr) throw new Error(upErr.message);
  } catch (err) {
    console.error('[call-recording] storage upload failed:', err);
    return NextResponse.json({ error: { code: 'UPLOAD_FAILED', message: '녹음 저장에 실패했습니다.' } }, { status: 500 });
  }

  // 보관 행 기록 (processing)
  const { data: rec } = await supabaseAdmin
    .from('call_recordings')
    .insert({
      student_id: id,
      storage_path: storagePath,
      duration_sec: durationSec,
      status: 'processing',
      expires_at: computeExpiresAt(Date.now()),
    })
    .select('id')
    .single();

  // 전사 + 요약
  try {
    const { summary } = await transcribeAndSummarizeCall(buffer, baseMime, `call.${ext}`);
    if (rec?.id) {
      await supabaseAdmin.from('call_recordings').update({ status: 'done' }).eq('id', rec.id);
    }
    return NextResponse.json({ data: { summary, recordingId: rec?.id ?? null } });
  } catch (err) {
    console.error('[call-recording] transcribe/summarize failed:', err);
    if (rec?.id) {
      await supabaseAdmin.from('call_recordings')
        .update({ status: 'failed', error: err instanceof Error ? err.message.slice(0, 500) : 'unknown' })
        .eq('id', rec.id);
    }
    return NextResponse.json(
      { error: { code: 'TRANSCRIBE_FAILED', message: '전사·요약에 실패했습니다. 녹음은 저장되었으니 잠시 후 다시 시도해주세요.' } },
      { status: 502 }
    );
  }
}
