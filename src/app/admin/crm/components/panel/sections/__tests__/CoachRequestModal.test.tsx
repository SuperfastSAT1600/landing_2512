// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { CoachRequestModal } from '../CoachRequestModal';

const COACHES = {
  success: true,
  coaches: [
    { slug: 'kim', name: '김혜지', isActive: true, subjects: ['RW'] },
    { slug: 'lee', name: '이수', isActive: true, subjects: ['Math'] },
  ],
};
const ROSTER = {
  data: {
    coaches: [{ key: 'kim', slug: 'kim', name: '김혜지', linked: true, registered: true, activeCount: 7, onboardingCount: 2, pausedCount: 1, students: [] }],
    unassigned: [],
  },
};

function mockFetch(rosterOk: boolean) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.startsWith('/api/admin/coaches')) return { ok: true, json: async () => COACHES };
    if (url.startsWith('/api/crm/coach-roster')) {
      if (!rosterOk) throw new Error('down');
      return { ok: true, json: async () => ROSTER };
    }
    throw new Error(`unexpected ${url}`);
  }));
}

const renderModal = () => render(<CoachRequestModal studentId="s1" studentName="홍길동" adminKey="k" onClose={() => {}} onCreated={() => {}} />);

describe('CoachRequestModal 담당 학생 수', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  // REQ-002
  it('코치마다 재원·온보딩 학생 수를 보여주고, 맡은 학생이 없는 코치는 0으로 보여준다', async () => {
    mockFetch(true);
    renderModal();
    await waitFor(() => expect(screen.getByText('재원 7 · 온보딩 2')).toBeTruthy());
    expect(screen.getByText('재원 0 · 온보딩 0')).toBeTruthy();
  });

  it('학생 수 조회가 실패해도 코치 선택 목록은 그대로 보이고 수는 —로 표시한다', async () => {
    mockFetch(false);
    renderModal();
    await waitFor(() => expect(screen.getByText('김혜지')).toBeTruthy());
    await waitFor(() => expect(screen.getAllByText('학생 수 —').length).toBe(2));
  });
});
