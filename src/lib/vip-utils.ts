import type { Student } from '@/types/crm';

export type VipReason = 'b2b' | 'referral' | 'special' | 'score';

export const VIP_REASON_LABELS: Record<VipReason, string> = {
  b2b: 'B2B',
  referral: '소개',
  special: '특수관계인',
  score: '1480+',
};

export const VIP_REASON_COLORS: Record<VipReason, string> = {
  b2b: 'bg-blue-100 text-blue-700',
  referral: 'bg-purple-100 text-purple-700',
  special: 'bg-red-100 text-red-700',
  score: 'bg-emerald-100 text-emerald-700',
};

export function detectVipReasons(student: Pick<
  Student,
  'lead_type' | 'previous_rw_score' | 'previous_math_score' | 'consultation_timeline'
>): VipReason[] {
  const reasons: VipReason[] = [];
  const memo = ((student.consultation_timeline as Array<{ raw_memo?: string }>) ?? [])
    .map(t => t.raw_memo ?? '')
    .join('\n');

  // 1. B2B
  if (student.lead_type === 'B2B') {
    reasons.push('b2b');
  }

  // 2. 시작 점수 1480+
  const rw = student.previous_rw_score ?? 0;
  const math = student.previous_math_score ?? 0;
  if (rw + math >= 1480) {
    reasons.push('score');
  } else {
    // 메모에서 Superscore/최고점수 1480+ 패턴 감지
    const matches = [...memo.matchAll(/(?:[Ss]uperscore|최고점수|최고\s*점수)?\s*(\d{4})\s*점/g)];
    if (matches.some(m => parseInt(m[1]) >= 1480)) {
      reasons.push('score');
    }
  }

  // 3. 지인/파트너 소개 — 코치 추천 문구 제외
  const memoLines = memo.split('\n');
  const genuineReferral = memoLines.filter(l =>
    /소개/.test(l) &&
    !/선생님.*추천|추천.*선생님|코치.*추천|Ben|쥴리|Julie|Platinum|환경|소개 한번 해드릴|소개해줄 예정/.test(l)
  );
  if (genuineReferral.length > 0) {
    reasons.push('referral');
  }

  // 4. 특수 관계인 — 대표, 임원, 투자자 등
  if (/대표|CEO|사장|임원|회장|오너|창업|투자|자제|특수/.test(memo)) {
    reasons.push('special');
  }

  return reasons;
}

export function isVipCandidate(student: Parameters<typeof detectVipReasons>[0]): boolean {
  return detectVipReasons(student).length > 0;
}
