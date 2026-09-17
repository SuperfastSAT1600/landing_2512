// 재결제 보드 컬럼 정렬. 순수 함수로 분리해 드래그·렌더와 무관하게 규칙을 검증한다
// (선례: renewal-candidate-filters.ts).

import type { RenewalTarget } from '@/types/crm';

type Sortable = Pick<RenewalTarget, 'next_contact_date' | 'stage_updated_at'>;

/**
 * 진행 단계(1~3) 컬럼 정렬 — 컨택 예정일이 가까운 순.
 *
 * 오름차순이므로 지난 날짜(밀린 약속)가 자연히 맨 위에 온다. 예정일을 아직 안 잡은 카드는
 * 날짜가 잡힌 카드 아래로 내리고, 그 안에서는 서버 정렬(stage_updated_at DESC)을 그대로 지킨다.
 * 터미널(4·5)은 결과가 확정된 행이라 이 정렬을 쓰지 않는다.
 */
export function sortByNextContact<T extends Sortable>(targets: T[]): T[] {
  return [...targets].sort((a, b) => {
    if (a.next_contact_date !== b.next_contact_date) {
      if (!a.next_contact_date) return 1;
      if (!b.next_contact_date) return -1;
      return a.next_contact_date.localeCompare(b.next_contact_date);
    }
    return b.stage_updated_at.localeCompare(a.stage_updated_at);
  });
}
