/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChurnModal } from '../ChurnModal';
import type { Student } from '@/types/crm';

vi.mock('@/lib/admin-user', () => ({ getAdminUserName: () => '이민재' }));

const STUDENT = { id: 's1', name: 'David Ahn' } as unknown as Student;

function renderModal(onConfirm = vi.fn()) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });
  vi.stubGlobal('fetch', fetchMock);
  render(<ChurnModal student={STUDENT} adminKey="k" onConfirm={onConfirm} onClose={vi.fn()} />);
  return { onConfirm, fetchMock };
}

afterEach(() => vi.unstubAllGlobals());

describe('ChurnModal', () => {
  it('이탈 사유를 상담 메모 API로 보낸다', async () => {
    const { fetchMock } = renderModal();

    fireEvent.change(screen.getByPlaceholderText(/이탈 사유를 구체적으로/), {
      target: { value: '콜 당일 무응답' },
    });
    fireEvent.click(screen.getByRole('button', { name: '이탈 처리' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/crm/students/s1/churn-memo');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      churn_tag: '회신 없음',
      reason: '콜 당일 무응답',
      churn_type: 'potential',
      author: '이민재',
    });
  });

  it('기존대로 "{태그}: {사유}"를 onConfirm에 넘긴다', async () => {
    const { onConfirm } = renderModal();

    fireEvent.change(screen.getByPlaceholderText(/이탈 사유를 구체적으로/), {
      target: { value: '콜 당일 무응답' },
    });
    fireEvent.click(screen.getByRole('button', { name: '이탈 처리' }));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith('회신 없음: 콜 당일 무응답', 'potential')
    );
  });

  it('메모 전송이 실패해도 이탈 처리는 진행한다', async () => {
    const onConfirm = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    render(<ChurnModal student={STUDENT} adminKey="k" onConfirm={onConfirm} onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/이탈 사유를 구체적으로/), {
      target: { value: '콜 당일 무응답' },
    });
    fireEvent.click(screen.getByRole('button', { name: '이탈 처리' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  it('사유가 비면 아무것도 보내지 않는다', async () => {
    const { onConfirm, fetchMock } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: '이탈 처리' }));

    expect(await screen.findByText('이탈 사유를 입력해주세요.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
