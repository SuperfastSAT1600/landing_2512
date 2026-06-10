import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { transcribeAndSummarizeCall, type AudioSegment } from '@/lib/call-transcribe';
import {
  ALLOWED_AUDIO_MIME, MAX_AUDIO_BYTES, MAX_SEGMENTS, computeExpiresAt, CALL_BUCKET,
} from '@/lib/call-recording';
import { ensureCallBucket } from '@/lib/call-recording-store';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
// 전사+화자분리+요약은 통화 길이에 따라 수십 초~분 걸릴 수 있어 여유를 둔다.
export const maxDuration = 300;

const EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

/**
 * POST /api/crm/students/[id]/call-recording
 * 통화 오디오(multipart: file, 긴 통화는 여러 개의 file 세그먼트)를 받아
 * 비공개 저장 + 전사·화자분리·요약 후 상담 메모 초안을 반환한다.
 * (자동 저장하지 않음 — 상담사가 메모란에서 검토 후 "메모 저장"으로 확정)
 */
export async function POST(
  request: NextRequest,
  { params: _pid }: { params: Promise<{ id: string }> }
) {
  const { id } = await _pid;
  if (!isAuthenticated(request)) return err('UNAUTHORIZED', '인증이 필요합니다.', 401);

  let files: File[] = [];
  let durationSec: number | null = null;
  try {
    const form = await request.formData();
    // 녹음 순서대로 전달된 세그먼트들 (단일 통화는 1개)
    files = form.getAll('file').filter((f): f is File => f instanceof File);
    const d = form.get('duration');
    durationSec = d ? Math.round(Number(d)) || null : null;
  } catch {
    return err('INVALID_FORM', '잘못된 요청 형식입니다.', 400);
  }

  if (files.length === 0) return err('NO_FILE', '오디오 파일이 없습니다.', 400);
  if (files.length > MAX_SEGMENTS) return err('TOO_MANY', '통화가 너무 깁니다. 나눠서 처리해주세요.', 400);

  for (const f of files) {
    const baseMime = f.type.split(';')[0].trim();
    if (!ALLOWED_AUDIO_MIME.has(baseMime)) return err('BAD_MIME', `지원하지 않는 오디오 형식입니다: ${f.type}`, 400);
    if (f.size > MAX_AUDIO_BYTES) return err('TOO_LARGE', '녹음 세그먼트가 너무 큽니다(최대 24MB).', 400);
  }

  const { data: student, error: studentErr } = await supabaseAdmin
    .from('students').select('id').eq('id', id).single();
  if (studentErr || !student) return err('STUDENT_NOT_FOUND', '학생을 찾을 수 없습니다.', 404);

  // 세그먼트별 버퍼/경로 준비 + 저장
  const folder = `${id}/${Date.now()}-${randomUUID().slice(0, 8)}`;
  const segments: AudioSegment[] = [];
  const storagePaths: string[] = [];
  try {
    await ensureCallBucket();
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const baseMime = f.type.split(';')[0].trim();
      const buffer = Buffer.from(await f.arrayBuffer());
      const ext = EXT[baseMime] ?? 'bin';
      const path = `${folder}/seg_${i}.${ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from(CALL_BUCKET).upload(path, buffer, { contentType: baseMime, upsert: false });
      if (upErr) throw new Error(upErr.message);
      storagePaths.push(path);
      segments.push({ buffer, mimeType: baseMime, filename: `seg_${i}.${ext}` });
    }
  } catch (e) {
    console.error('[call-recording] storage upload failed:', e);
    return err('UPLOAD_FAILED', '녹음 저장에 실패했습니다.', 500);
  }

  // 보관 행 기록 (processing). 여러 세그먼트 경로는 콤마로 보관.
  const { data: rec } = await supabaseAdmin
    .from('call_recordings')
    .insert({
      student_id: id,
      storage_path: storagePaths.join(','),
      duration_sec: durationSec,
      status: 'processing',
      expires_at: computeExpiresAt(Date.now()),
    })
    .select('id')
    .single();

  // 전사 + 화자분리 + 요약
  try {
    const { transcript, summary } = await transcribeAndSummarizeCall(segments);
    if (rec?.id) {
      await supabaseAdmin.from('call_recordings').update({ status: 'done', transcript }).eq('id', rec.id);
    }
    return NextResponse.json({ data: { summary, recordingId: rec?.id ?? null } });
  } catch (e) {
    console.error('[call-recording] transcribe/summarize failed:', e);
    if (rec?.id) {
      await supabaseAdmin.from('call_recordings')
        .update({ status: 'failed', error: e instanceof Error ? e.message.slice(0, 500) : 'unknown' })
        .eq('id', rec.id);
    }
    return err('TRANSCRIBE_FAILED', '전사·요약에 실패했습니다. 녹음은 저장되었으니 잠시 후 다시 시도해주세요.', 502);
  }
}
