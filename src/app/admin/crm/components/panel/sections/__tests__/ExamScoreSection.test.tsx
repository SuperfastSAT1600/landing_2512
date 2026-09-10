/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExamScoreSection } from '../ExamScoreSection';
import type { Student } from '@/types/crm';

vi.mock('@/lib/admin-user', () => ({ getAdminUserName: () => '이민재' }));

const STUDENT = { id: 's1', name: '채종헌' } as unknown as Student;

const ROWS = [
  { id: 'e1', student_id: 's1', exam_month: '2026-08', rw_score: 710, math_score: 780, note: null, created_by: '이민재', created_at: '', updated_at: '' },
  { id: 'e2', student_id: 's1', exam_month: '2026-06', rw_score: 680, math_score: 750, note: null, created_by: '이민재', created_at: '', updated_at: '' },
];

function mockFetch(rows = ROWS) {
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (!init || init.method === undefined || init.method === 'GET') {
      return Promise.resolve({ ok: true, json: async () => ({ data: rows }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'new' } }) });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

async function renderSection(rows = ROWS) {
  const fetchMock = mockFetch(rows);
  render(<ExamScoreSection student={STUDENT} adminKey="k" />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  // 다른 상세 패널 섹션과 같이 기본은 접힘 상태다.
  fireEvent.click(screen.getByRole('button', { name: /실제 시험 성적/ }));
  return fetchMock;
}

describe('ExamScoreSection', () => {
  it('회차를 최신순으로 보여주고 총점을 합산한다', async () => {
    await renderSection();
    expect(await screen.findByText('2026-08')).toBeTruthy();
    expect(screen.getByText('1490')).toBeTruthy();
    expect(screen.getByText('1430')).toBeTruthy();

    const months = screen.getAllByTestId('exam-month').map((el) => el.textContent);
    expect(months).toEqual(['2026-08', '2026-06']);
  });

  it('직전 회차 대비 증감을 보여준다', async () => {
    await renderSection();
    expect(await screen.findByText('+60')).toBeTruthy();
  });

  it('기록이 없으면 안내를 보여준다', async () => {
    await renderSection([]);
    expect(await screen.findByText(/아직 기록된 시험 성적이 없습니다/)).toBeTruthy();
  });

  it('입력하는 동안 총점을 미리 보여준다', async () => {
    await renderSection([]);
    fireEvent.click(screen.getByRole('button', { name: /성적 추가/ }));

    fireEvent.change(screen.getByLabelText('시험월'), { target: { value: '2026-10' } });
    fireEvent.change(screen.getByLabelText('RW'), { target: { value: '700' } });
    fireEvent.change(screen.getByLabelText('Math'), { target: { value: '800' } });

    expect(screen.getByTestId('draft-total').textContent).toContain('1500');
  });

  it('저장하면 시험월과 점수를 API로 보낸다', async () => {
    const fetchMock = await renderSection([]);
    fireEvent.click(screen.getByRole('button', { name: /성적 추가/ }));

    fireEvent.change(screen.getByLabelText('시험월'), { target: { value: '2026-10' } });
    fireEvent.change(screen.getByLabelText('RW'), { target: { value: '700' } });
    fireEvent.change(screen.getByLabelText('Math'), { target: { value: '800' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, i]) => (i as RequestInit)?.method === 'POST');
      expect(post).toBeTruthy();
      expect(post![0]).toBe('/api/crm/students/s1/exam-scores');
      expect(JSON.parse((post![1] as RequestInit).body as string)).toEqual({
        exam_month: '2026-10',
        rw_score: 700,
        math_score: 800,
        created_by: '이민재',
      });
    });
  });

  it('시험월이 없으면 저장 버튼이 비활성이다', async () => {
    await renderSection([]);
    fireEvent.click(screen.getByRole('button', { name: /성적 추가/ }));
    fireEvent.change(screen.getByLabelText('RW'), { target: { value: '700' } });

    expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('RW·Math 를 둘 다 비우면 저장할 수 없다', async () => {
    await renderSection([]);
    fireEvent.click(screen.getByRole('button', { name: /성적 추가/ }));
    fireEvent.change(screen.getByLabelText('시험월'), { target: { value: '2026-10' } });

    expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('범위를 벗어난 점수는 저장을 막는다', async () => {
    await renderSection([]);
    fireEvent.click(screen.getByRole('button', { name: /성적 추가/ }));
    fireEvent.change(screen.getByLabelText('시험월'), { target: { value: '2026-10' } });
    fireEvent.change(screen.getByLabelText('RW'), { target: { value: '815' } });

    expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
