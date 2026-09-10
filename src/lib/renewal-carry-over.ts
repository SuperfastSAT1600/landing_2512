// 재결제 미결 대상(1~3단계)을 현재 주차로 이월한다.
// 라우트가 아니라 lib에 두는 이유는 crm-stats-service 와 같다 — 나중에 cron 에서
// 부르게 되면 얇은 라우트만 하나 더 붙이면 된다.
//
// 트랜잭션이 없으므로 순서가 안전성을 결정한다. 반드시 INSERT 먼저, UPDATE 나중:
//  - UPDATE 먼저면 원 행을 닫은 직후 실패했을 때 새 행이 없어 학생이 파이프라인에서
//    사라지고, 스캔 조건(carried_to_week IS NULL)에 다시 안 걸려 영구 소실된다.
//  - INSERT 먼저면 부분 실패해도 원 행이 열린 채라 다음 실행에서 다시 스캔되고,
//    INSERT 는 UNIQUE(student_id, week_start) 로 무시돼 UPDATE 만 재수행된다(자동 복구).
//  - 덤으로 어느 순간에도 그 학생의 열린 행이 최소 1개라, 두 쿼리 사이에
//    후보 목록(getRenewalCandidates)이 그 학생을 노출하는 창이 생기지 않는다.

import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentWeekDef } from '@/lib/week-definitions';
import { RENEWAL_OPEN_STAGES, type RenewalStage } from '@/types/crm';

export interface CarryOverResult {
  /** 이월 대상 주차. 주차 정의 범위 밖이면 null(아무것도 하지 않음). */
  week_start: string | null;
  /** 새로 만든 행 수. 이미 있던 학생은 세지 않는다. */
  created: number;
  /** 이월 표시를 찍은 원 행 수. */
  closed: number;
}

type SourceRow = {
  id: string;
  student_id: string;
  week_start: string;
  stage: RenewalStage;
  stage_updated_at: string;
};

export type CarryOverOutcome =
  | { ok: true; data: CarryOverResult }
  | { ok: false; code: 'FETCH_FAILED' | 'INSERT_FAILED' | 'UPDATE_FAILED'; message: string };

/**
 * 지난 주차들에 열려 있는(1~3단계, 아직 이월되지 않은) 행을 현재 주차로 복제하고
 * 원 행에 이월 표시를 남긴다. 멱등 — 같은 주차에 여러 번 호출해도 안전하다.
 */
export async function carryOverRenewalTargets(now: Date = new Date()): Promise<CarryOverOutcome> {
  const weekDef = getCurrentWeekDef(now);
  // 주차 정의 범위 밖(정의는 2026-12-27까지)이면 '현재 주차'를 알 수 없으므로 아무것도 안 한다.
  if (!weekDef) return { ok: true, data: { week_start: null, created: 0, closed: 0 } };

  const current = weekDef.start;

  const { data, error } = await supabaseAdmin
    .from('renewal_targets')
    .select('id, student_id, week_start, stage, stage_updated_at')
    .in('stage', RENEWAL_OPEN_STAGES)
    .lt('week_start', current)
    .is('carried_to_week', null);

  if (error) {
    console.error('[renewal-carry-over] scan', error);
    return { ok: false, code: 'FETCH_FAILED', message: '이월 대상 조회에 실패했습니다.' };
  }

  const sources = (data ?? []) as SourceRow[];
  if (sources.length === 0) {
    return { ok: true, data: { week_start: current, created: 0, closed: 0 } };
  }

  // 학생당 1행으로 접는다. 되돌리기(5→2) PATCH 에 주차 가드가 없어 한 학생이 여러 주차에
  // 열린 행을 가질 수 있는데, payload 에 같은 (student_id, week_start) 가 두 번 들어가면
  // ON CONFLICT DO NOTHING 이 어느 쪽을 남길지 비결정적이 된다. 최신 주차 행을 승계한다.
  const latestByStudent = new Map<string, SourceRow>();
  for (const row of sources) {
    const kept = latestByStudent.get(row.student_id);
    if (!kept || row.week_start > kept.week_start) latestByStudent.set(row.student_id, row);
  }

  const nowIso = now.toISOString();
  const inserts = Array.from(latestByStudent.values()).map((row) => ({
    student_id: row.student_id,
    week_start: current,
    stage: row.stage,
    // 리셋 금지 — 카드의 '단계 D+N' 과 목록 정렬이 여기 걸려 있다. 승계해야 주차를 넘어
    // 정체 기간이 누적돼 7일/14일 경고가 제대로 뜬다.
    stage_updated_at: row.stage_updated_at,
    carried_from_week: row.week_start,
    created_by: 'carry-over',
    updated_at: nowIso,
  }));

  // 배열 .insert()는 한 행만 충돌해도 배치 전체가 abort 되므로 upsert + ignoreDuplicates.
  const { data: created, error: insertError } = await supabaseAdmin
    .from('renewal_targets')
    .upsert(inserts, { onConflict: 'student_id,week_start', ignoreDuplicates: true })
    .select('id');

  if (insertError) {
    console.error('[renewal-carry-over] insert', insertError);
    return { ok: false, code: 'INSERT_FAILED', message: '이월 대상 생성에 실패했습니다.' };
  }

  // 원 행은 스캔된 것을 전부 닫는다 — 한 학생이 두 주차에 열려 있었다면 각 주차가 각자
  // '이월 1' 을 갖는 게 의미상 정직하다. stage_updated_at 은 건드리지 않는다.
  const { data: closedRows, error: updateError } = await supabaseAdmin
    .from('renewal_targets')
    .update({ carried_to_week: current, updated_at: nowIso })
    .in('id', sources.map((r) => r.id))
    .is('carried_to_week', null)
    .select('id');

  if (updateError) {
    console.error('[renewal-carry-over] close', updateError);
    return { ok: false, code: 'UPDATE_FAILED', message: '이월 표시에 실패했습니다.' };
  }

  return {
    ok: true,
    data: {
      week_start: current,
      created: (created ?? []).length,
      closed: (closedRows ?? []).length,
    },
  };
}
