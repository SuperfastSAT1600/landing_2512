/**
 * `call_transcripts` 단일 쓰기 경로.
 *
 * 라우트(실시간 캡처)와 백필 스크립트가 같은 함수로 넣어야 컬럼 매핑·시각 해석이
 * 갈라지지 않는다. 읽기 경로는 의도적으로 두지 않는다 — 이 테이블은 미성년자·학부모
 * 대화 원문이고, 지금 단계에서 필요한 건 축적뿐이다.
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
