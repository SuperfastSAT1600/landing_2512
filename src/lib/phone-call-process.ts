/**
 * 통화 녹음 → 전사 → 상담 메모 처리 (웹훅·수동 재시도 공유).
 * Daily 녹음 access-link로 오디오를 받아 기존 전사·요약 파이프라인을 거쳐
 * consultation_timeline에 메모 초안을 자동 생성한다.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';
import { transcribeAndSummarizeCall, type AudioSegment } from '@/lib/call-transcribe';
import { appendConsultationEntry } from '@/lib/consultation-timeline';
import { getRecordingAccessLink, MAX_AUDIO_BYTES } from '@/lib/phone-call';

const MEMO_HEADER = '📞 통화 자동 요약';

function filenameFor(contentType: string): { mime: string; filename: string } {
  const mime = contentType.split(';')[0].trim() || 'audio/mp4';
  const ext = mime.includes('webm')
    ? 'webm'
    : mime.includes('ogg')
      ? 'ogg'
      : mime.includes('wav')
        ? 'wav'
        : mime.includes('mpeg') || mime.includes('mp3')
          ? 'mp3'
          : 'm4a';
  return { mime, filename: `call.${ext}` };
}

interface CallSessionRow {
  id: string;
  student_id: string;
  recording_id: string | null;
  timeline_entry_id: string | null;
}

/**
 * call_sessions 행 하나를 전사·요약 → 메모 생성까지 처리한다.
 * 이미 timeline_entry_id가 있으면(웹훅 재시도) 중복 생성 없이 종료(idempotent).
 * 결과는 call_sessions.status로 기록(done/failed)하고 throw하지 않는다.
 */
export async function processCallRecording(callId: string): Promise<void> {
  const { data: session } = await supabaseAdmin
    .from('call_sessions')
    .select('id, student_id, recording_id, timeline_entry_id')
    .eq('id', callId)
    .single<CallSessionRow>();

  if (!session) return;
  if (session.timeline_entry_id) return; // 이미 메모 생성됨
  if (!session.recording_id) {
    await fail(callId, '녹음 ID가 없습니다.');
    return;
  }

  try {
    const link = await getRecordingAccessLink(session.recording_id);
    const res = await fetch(link);
    if (!res.ok) throw new Error(`녹음 다운로드 실패: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    if (buffer.byteLength > MAX_AUDIO_BYTES) {
      await fail(callId, '녹음 용량이 전사 한도(24MB)를 초과합니다. 통화가 너무 깁니다.');
      return;
    }

    const { mime, filename } = filenameFor(res.headers.get('content-type') ?? '');
    const segments: AudioSegment[] = [{ buffer, mimeType: mime, filename }];
    const { transcript, summary } = await transcribeAndSummarizeCall(segments);

    const entry = await appendConsultationEntry(session.student_id, {
      raw_memo: `${MEMO_HEADER}\n\n${summary}`,
      published: false,
    });

    await supabaseAdmin
      .from('call_sessions')
      .update({ status: 'done', transcript, summary, timeline_entry_id: entry.id })
      .eq('id', callId);
  } catch (e) {
    console.error('[phone-call-process]', e);
    await fail(callId, e instanceof Error ? e.message.slice(0, 500) : 'unknown');
  }
}

async function fail(callId: string, error: string): Promise<void> {
  await supabaseAdmin.from('call_sessions').update({ status: 'failed', error }).eq('id', callId);
}
