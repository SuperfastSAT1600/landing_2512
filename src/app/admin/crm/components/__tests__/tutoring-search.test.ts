import { describe, it, expect } from 'vitest';
import { matchUnlinkedForSearch } from '../tutoring-search';
import type { CrmUnlinkedStudent } from '@/app/api/admin/srm/tutoring-users/route';

const s = (id: string, name: string, reason: CrmUnlinkedStudent['reason']): CrmUnlinkedStudent =>
  ({ id, name, grade: null, parent_phone: null, reason });
const list = [s('a', '정민채', 'no_srm_payment'), s('b', 'Claire Lee', 'no_profile')];

// REQ-003 (crm-tutoring-search-gap)
describe('matchUnlinkedForSearch', () => {
  it('전체 탭에서 검색어가 있으면 이름이 맞는 미연결 학생을 돌려준다(대소문자 무시)', () => {
    expect(matchUnlinkedForSearch(list, 'all', ' 정민 ').map((x) => x.id)).toEqual(['a']);
    expect(matchUnlinkedForSearch(list, 'all', 'claire').map((x) => x.id)).toEqual(['b']);
  });

  it('검색어가 없으면 전체 탭에 미연결 학생을 섞지 않는다', () => {
    expect(matchUnlinkedForSearch(list, 'all', '  ')).toEqual([]);
  });

  it('미연결 탭은 검색어로만 거르고, 검색어가 없으면 전부', () => {
    expect(matchUnlinkedForSearch(list, 'unlinked', '')).toEqual(list);
    expect(matchUnlinkedForSearch(list, 'unlinked', '정민채').map((x) => x.id)).toEqual(['a']);
  });

  it('전체 탭에서 VIP만 보기가 켜져 있으면 미연결 학생을 섞지 않는다', () => {
    expect(matchUnlinkedForSearch(list, 'all', '정민채', true)).toEqual([]);
  });

  it('상태 탭(재원 등)에서는 미연결 학생을 보여 주지 않는다', () => {
    expect(matchUnlinkedForSearch(list, 'active', '정민채')).toEqual([]);
  });
});
