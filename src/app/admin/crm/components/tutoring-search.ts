// 튜터링 중 탭에서 미연결 학생(CRM 결제 완료인데 튜터링 목록에 못 들어간 학생)을 보여 줄지 정한다.
import type { CrmUnlinkedStudent } from '@/app/api/admin/srm/tutoring-users/route';
import type { TutoringSubTab } from './TutoringStudentRow';

/**
 * 미연결 탭: 검색어로 거른 전부. 전체 탭: 검색어가 있을 때만 이름이 맞는 학생.
 * 전체 탭 검색에서 빠지면 "수업 중인데 검색이 안 된다"로 보이기 때문이다.
 * 전체 탭의 VIP 필터가 켜져 있으면 넣지 않는다(미연결 학생은 VIP 여부를 모른다).
 */
export function matchUnlinkedForSearch(
  students: CrmUnlinkedStudent[],
  subTab: TutoringSubTab,
  searchQuery: string,
  vipOnly = false,
): CrmUnlinkedStudent[] {
  const q = searchQuery.trim().toLowerCase();
  if (subTab === 'unlinked') return q ? students.filter((s) => s.name.toLowerCase().includes(q)) : students;
  if (subTab !== 'all' || !q || vipOnly) return [];
  return students.filter((s) => s.name.toLowerCase().includes(q));
}
