import { render, screen, waitFor } from '@testing-library/react';
import { RenewalKanban } from '../RenewalKanban';
import type { RenewalStage, RenewalTarget } from '@/types/crm';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function target(id: string, stage: RenewalStage, name: string): RenewalTarget {
  return {
    id,
    student_id: `stu-${id}`,
    week_start: '2026-08-10',
    stage,
    stage_updated_at: '2026-08-10T00:00:00Z',
    converted_payment_id: null,
    drop_reason: null,
    memo: null,
    next_contact_date: null,
    outcome_quality: null,
    outcome_reason_tag: null,
    outcome_reason_note: null,
    carried_to_week: null,
    carried_from_week: null,
    created_by: null,
    created_at: '2026-08-10T00:00:00Z',
    updated_at: '2026-08-10T00:00:00Z',
    student: { id: `stu-${id}`, name } as RenewalTarget['student'],
  };
}

const TARGETS = [target('a', '1', '김하나'), target('b', '3', '박둘'), target('c', '4', '이셋')];

function respond(url: string) {
  if (url.includes('/renewal-targets/stats')) return { data: [] };
  if (url.includes('/renewal-targets')) return { data: TARGETS };
  if (url.includes('tutoring-users')) return { linked: [] };
  return { data: [] };
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => respond(String(url)),
  }));
});

function setup() {
  return render(
    <RenewalKanban adminKey="k" onSelectStudentById={vi.fn()} onStudentUpdate={vi.fn()} />
  );
}

describe('RenewalKanban 렌더', () => {
  it('목 API의 타깃을 단계 컬럼에 렌더한다', async () => {
    setup();
    expect(screen.getByText('불러오는 중...')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('김하나')).toBeTruthy());
    expect(screen.getByText('박둘')).toBeTruthy();
    expect(screen.getByText('이셋')).toBeTruthy();
    for (const stage of ['1', '2', '3', '4', '5']) {
      expect(screen.getByText(new RegExp(`^${stage}\\. `))).toBeTruthy();
    }
  });

  it('보드·통계·튜터링 소스를 불러온다', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('김하나')).toBeTruthy());
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/api/crm/renewal-targets/stats?weeks=8'))).toBe(true);
    expect(urls).toContain('/api/crm/students?lead_status=enrolled');
    expect(urls).toContain('/api/admin/srm/tutoring-users');
  });

  it('후보 추가 버튼을 누르면 후보 패널이 열리고 버튼은 사라진다', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('김하나')).toBeTruthy());
    screen.getByRole('button', { name: /재결제 대상 추가/ }).click();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /재결제 대상 추가/ })).toBeNull()
    );
  });
});
