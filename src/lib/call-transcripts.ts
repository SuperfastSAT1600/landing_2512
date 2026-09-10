/**
 * `call_transcripts` 단일 쓰기 경로.
 *
 * 라우트(실시간 캡처)와 백필 스크립트가 같은 함수로 넣어야 컬럼 매핑·시각 해석이
 * 갈라지지 않는다. 읽기 경로는 중복 방지용 조회 하나로 제한한다 — 이 테이블은
 * 미성년자·학부모 대화 원문이고, 본문을 화면으로 흘려보내는 경로는 만들지 않는다.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';
import { toUtcDate } from '@/lib/plaud-backfill';

export interface CallTranscriptInput {
  studentId: string;
  /** 이 전사를 요약한 ConsultationEntry.id */
  timelineEntryId?: string;
  source: 'plaud' | 'voip';
  /** 소스 시스템 녹음 id. plaud면 file_id. 없으면 중복 방지 대상에서 빠진다. */
  externalId?: string;
  recordingName?: string;
  /** Plaud 원본 문자열(타임존 표기 없는 UTC 가능). 인스턴트로 정규화해 저장한다. */
  recordedAt?: string;
  durationSec?: number;
  transcript: string;
  asrModel?: string;
}

/**
 * 전사 한 건을 저장한다.
 * @throws 삽입 실패 시 Supabase 에러를 그대로 던진다. 호출자가 격리 여부를 정한다
 *         (라우트는 메모를 지키려고 삼키고, 백필은 건별로 기록한 뒤 계속 간다).
 */
export async function insertCallTranscript(input: CallTranscriptInput): Promise<void> {
  const { error } = await supabaseAdmin.from('call_transcripts').insert({
    student_id: input.studentId,
    timeline_entry_id: input.timelineEntryId ?? null,
    source: input.source,
    external_id: input.externalId ?? null,
    recording_name: input.recordingName ?? null,
    recorded_at: input.recordedAt ? (toUtcDate(input.recordedAt)?.toISOString() ?? null) : null,
    duration_sec: input.durationSec ?? null,
    transcript: input.transcript,
    asr_model: input.asrModel ?? null,
  });
  if (error) throw error;
}

/**
 * 같은 녹음의 전사가 이미 있으면 돌려준다 (없으면 null).
 *
 * 한 통화가 상담메모 여럿에 붙는 경우가 있다 — 자매 학생 두 레코드에 각각 기록하거나,
 * 같은 녹음으로 메모를 두 번 만든 경우. 그때 오디오를 다시 전사하는 건 같은 텍스트를
 * 두 번 사는 것이므로, 기존 전사를 재사용한다.
 */
export async function findTranscriptByExternalId(
  source: 'plaud' | 'voip',
  externalId: string
): Promise<{ transcript: string; asrModel: string | null } | null> {
  const { data, error } = await supabaseAdmin
    .from('call_transcripts')
    .select('transcript, asr_model')
    .eq('source', source)
    .eq('external_id', externalId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { transcript: data.transcript as string, asrModel: (data.asr_model as string | null) ?? null };
}
