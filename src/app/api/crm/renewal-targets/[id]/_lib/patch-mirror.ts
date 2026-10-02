import { appendConsultationEntry } from '@/lib/consultation-timeline';
import { notifyMemoToSlack, RENEWAL_OUTCOME_HEADING } from '@/lib/slack-memo';
import { buildRenewalOutcomeMemo } from '@/lib/renewal/mirror';
import type { PatchBody } from './patch-input';
import type { PatchPlan } from './patch-update';

/**
 * 결과 사유가 저장됐으면 타임라인과 슬랙에 같은 본문을 남긴다.
 * 정본은 renewal_targets — 타임라인과 슬랙은 사람이 읽는 미러다(윈백 발송과 같은 구조).
 * 실패해도 이미 저장된 결과를 되돌리지 않는다.
 */
export async function mirrorOutcome(
  plan: PatchPlan,
  studentId: string,
  body: PatchBody
): Promise<void> {
  const { update, effectiveQuality, effectiveStage } = plan;
  if (!(update.outcome_reason_tag && effectiveQuality && effectiveStage)) return;

  const memo = buildRenewalOutcomeMemo({
    stage: effectiveStage,
    quality: effectiveQuality,
    reasonTag: update.outcome_reason_tag as string,
    reasonNote: (update.outcome_reason_note as string | null) ?? null,
  });
  const author = typeof body.author === 'string' && body.author.trim() ? body.author.trim() : undefined;
  try {
    await appendConsultationEntry(studentId, { raw_memo: memo, author, published: false });
  } catch (e) {
    console.error('[renewal-targets/[id] timeline]', e);
  }
  try {
    await notifyMemoToSlack({
      studentId,
      memo,
      author,
      heading: RENEWAL_OUTCOME_HEADING,
    });
  } catch (e) {
    console.error('[renewal-targets/[id] slack]', e);
  }
}
