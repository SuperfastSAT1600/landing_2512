/**
 * 상담 타임라인(students.consultation_timeline) 공통 append 로직.
 * 메모 저장 라우트와 통화 녹음 웹훅이 동일한 경로로 메모를 추가하기 위해 추출.
 *
 * students row를 UPDATE하므로 useCrmRealtime UPDATE 구독이 발화 → CRM 패널 자동 갱신.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Attachment, ConsultationEntry } from '@/types/crm';
import { randomUUID } from 'crypto';

export class StudentNotFoundError extends Error {
  constructor() {
    super('Student not found');
    this.name = 'StudentNotFoundError';
  }
}

/**
 * 학생의 consultation_timeline에 새 메모 항목을 추가하고 last_contacted_at을 갱신한다.
 * @returns 생성된 ConsultationEntry
 * @throws StudentNotFoundError 학생이 없을 때
 */
export async function appendConsultationEntry(
  studentId: string,
  input: { raw_memo: string; author?: string; published?: boolean; attachments?: Attachment[] }
): Promise<ConsultationEntry> {
  const { data: student, error: fetchError } = await supabaseAdmin
    .from('students')
    .select('consultation_timeline')
    .eq('id', studentId)
    .single();

  if (fetchError || !student) throw new StudentNotFoundError();

  const existing: ConsultationEntry[] = Array.isArray(student.consultation_timeline)
    ? student.consultation_timeline
    : [];

  const attachments = input.attachments ?? [];
  const newEntry: ConsultationEntry = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    raw_memo: input.raw_memo.trim(),
    ...(input.author ? { author: input.author } : {}),
    published: input.published ?? false,
    ...(attachments.length > 0 ? { attachments } : {}),
  };

  const { error } = await supabaseAdmin
    .from('students')
    .update({
      consultation_timeline: [...existing, newEntry],
      last_contacted_at: new Date().toISOString(),
    })
    .eq('id', studentId);

  if (error) throw new Error(`Failed to append memo: ${error.message}`);

  return newEntry;
}
