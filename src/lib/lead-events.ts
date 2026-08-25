import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * 리드 행동 이벤트 기록 (ARGOSS Phase 1).
 * lead_events는 append-only 원천 데이터 — funnel_stage 등 students 상태는 절대 건드리지 않는다.
 * 기록 실패는 warn만 하고 호출부 응답에 영향을 주지 않는다.
 */

export type LeadEventType =
  | 'portal_viewed'
  | 'srm_report_viewed'
  | 'signup_link_clicked'
  | 'diagnostic_submitted';

/** 열람류 이벤트 중복 방지 창(분). 새로고침 연타를 1회로 접되, 재방문 신호는 살린다. */
export const LEAD_EVENT_DEDUP_MINUTES = 30;

interface LogLeadEventOptions {
  metadata?: Record<string, unknown>;
  /** 지정 시 같은 학생·같은 유형 이벤트가 이 시간(분) 내에 있으면 기록 생략 */
  dedupMinutes?: number;
}

/** @returns 실제로 기록됐으면 true (dedup 생략·실패는 false) */
export async function logLeadEvent(
  studentId: string,
  eventType: LeadEventType,
  options: LogLeadEventOptions = {}
): Promise<boolean> {
  const { metadata = {}, dedupMinutes } = options;

  try {
    if (dedupMinutes && dedupMinutes > 0) {
      const cutoff = new Date(Date.now() - dedupMinutes * 60_000).toISOString();
      const { data: recent } = await supabaseAdmin
        .from('lead_events')
        .select('id')
        .eq('student_id', studentId)
        .eq('event_type', eventType)
        .gte('occurred_at', cutoff)
        .limit(1)
        .maybeSingle();

      if (recent) return false;
    }

    const { error } = await supabaseAdmin
      .from('lead_events')
      .insert([{ student_id: studentId, event_type: eventType, metadata }]);

    if (error) {
      console.warn(`[lead-events] insert failed (${eventType}):`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[lead-events] failed (${eventType}):`, err);
    return false;
  }
}
