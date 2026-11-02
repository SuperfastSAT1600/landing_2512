import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CrmUnlinkedRow } from '../CrmUnlinkedRow';
import type { CrmUnlinkedStudent } from '@/app/api/admin/srm/tutoring-users/route';

const student = (reason: CrmUnlinkedStudent['reason']): CrmUnlinkedStudent =>
  ({ id: 'c1', name: '정민채', grade: 'Y11', parent_phone: '010-1', reason });

// REQ-002 (crm-tutoring-search-gap)
describe('CrmUnlinkedRow', () => {
  it('프로필 미연결이면 SFv2 미연결 배지와 SRM 연결 버튼을 보여 준다', () => {
    const onLink = vi.fn();
    const onClick = vi.fn();
    render(<CrmUnlinkedRow student={student('no_profile')} onClick={onClick} onLink={onLink} />);
    expect(screen.getByText('SFv2 미연결')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'SRM 연결' }));
    expect(onLink).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('SRM 결제 계정이 없으면 결제 등록 전 배지만 보여 주고 연결 버튼은 없다', () => {
    render(<CrmUnlinkedRow student={student('no_srm_payment')} onClick={vi.fn()} onLink={vi.fn()} />);
    expect(screen.getByText('SRM 결제 등록 전')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'SRM 연결' })).toBeNull();
  });

  it('행을 누르면 학생 패널을 연다', () => {
    const onClick = vi.fn();
    render(<CrmUnlinkedRow student={student('no_srm_payment')} onClick={onClick} onLink={vi.fn()} />);
    fireEvent.click(screen.getByText('정민채'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
