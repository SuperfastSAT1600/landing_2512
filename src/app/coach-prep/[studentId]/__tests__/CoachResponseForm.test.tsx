import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CoachResponseForm } from '../CoachResponseForm';
import type { CoachRequestInfo } from '@/types/coach-prep';

const info = (over: Partial<CoachRequestInfo> = {}): CoachRequestInfo => ({
  token: 't'.repeat(32), coach_name: '김혜지', deadline_at: '2099-01-01T00:00:00Z', created_at: '2026-10-20T00:00:00Z', status: 'pending',
  first_lesson_at: null, second_lesson_at: null, option2_first_lesson_at: null, option2_second_lesson_at: null,
  decline_reason: null, ...over,
});

const inputs = () => Array.from(document.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]'));
const fill = (el: HTMLInputElement, v: string) => fireEvent.change(el, { target: { value: v } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { status: 'accepted', first_lesson_at: '2099-02-02T01:00:00Z', second_lesson_at: '2099-02-04T01:00:00Z', option2_first_lesson_at: null, option2_second_lesson_at: null, decline_reason: null } }),
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('CoachResponseForm — 옵션 1·2', () => {
  // REQ-004
  it('수락을 고르면 옵션 1(필수)·옵션 2(선택)의 첫/두 번째 수업 입력 4칸이 나온다', () => {
    render(<CoachResponseForm info={info()} />);
    fireEvent.click(screen.getByRole('radio', { name: '수업 가능합니다' }));
    expect(screen.getByText('옵션 1 (필수)')).toBeTruthy();
    expect(screen.getByText('옵션 2 (선택)')).toBeTruthy();
    expect(inputs()).toHaveLength(4);
  });

  it('날짜를 입력하면 그 옆에 날짜와 요일이 보인다', () => {
    render(<CoachResponseForm info={info()} />);
    fireEvent.click(screen.getByRole('radio', { name: '수업 가능합니다' }));
    fill(inputs()[0], '2099-02-02T10:00');
    expect(screen.getByText('02/02(월)')).toBeTruthy();
  });

  it('옵션 1이 비어 있으면 보내지 않고 안내한다', async () => {
    render(<CoachResponseForm info={info()} />);
    fireEvent.click(screen.getByRole('radio', { name: '수업 가능합니다' }));
    fill(inputs()[0], '2099-02-02T10:00');
    fireEvent.click(screen.getByRole('button', { name: '응답 보내기' }));
    expect((await screen.findByRole('alert')).textContent).toContain('옵션 1');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('두 번째 수업이 첫 수업보다 빠르면 보내지 않는다', async () => {
    render(<CoachResponseForm info={info()} />);
    fireEvent.click(screen.getByRole('radio', { name: '수업 가능합니다' }));
    fill(inputs()[0], '2099-02-04T10:00');
    fill(inputs()[1], '2099-02-02T10:00');
    fireEvent.click(screen.getByRole('button', { name: '응답 보내기' }));
    expect((await screen.findByRole('alert')).textContent).toContain('늦어야');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('옵션 2를 한 칸만 채우면 보내지 않는다', async () => {
    render(<CoachResponseForm info={info()} />);
    fireEvent.click(screen.getByRole('radio', { name: '수업 가능합니다' }));
    fill(inputs()[0], '2099-02-02T10:00');
    fill(inputs()[1], '2099-02-04T10:00');
    fill(inputs()[2], '2099-02-03T10:00');
    fireEvent.click(screen.getByRole('button', { name: '응답 보내기' }));
    expect((await screen.findByRole('alert')).textContent).toContain('옵션 2');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('옵션 1만 채우면 옵션 2 없이 +09:00 일시로 보낸다', async () => {
    render(<CoachResponseForm info={info()} />);
    fireEvent.click(screen.getByRole('radio', { name: '수업 가능합니다' }));
    fill(inputs()[0], '2099-02-02T10:00');
    fill(inputs()[1], '2099-02-04T10:00');
    fireEvent.click(screen.getByRole('button', { name: '응답 보내기' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ token: 't'.repeat(32), action: 'accept', first_lesson_at: '2099-02-02T10:00:00+09:00', second_lesson_at: '2099-02-04T10:00:00+09:00' });
    expect(await screen.findByText('응답이 기록되었습니다')).toBeTruthy();
    expect(screen.getByText('옵션 1')).toBeTruthy();
  });

  it('옵션 2까지 채우면 네 일시를 모두 보낸다', async () => {
    render(<CoachResponseForm info={info()} />);
    fireEvent.click(screen.getByRole('radio', { name: '수업 가능합니다' }));
    ['2099-02-02T10:00', '2099-02-04T10:00', '2099-02-03T11:00', '2099-02-05T11:00'].forEach((v, i) => fill(inputs()[i], v));
    fireEvent.click(screen.getByRole('button', { name: '응답 보내기' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      option2_first_lesson_at: '2099-02-03T11:00:00+09:00', option2_second_lesson_at: '2099-02-05T11:00:00+09:00',
    });
  });

  it('이미 응답한 코치에게는 저장된 옵션 1·2를 요일과 함께 보여주고, 수정하면 값이 채워져 있다', () => {
    render(<CoachResponseForm info={info({
      status: 'accepted',
      first_lesson_at: '2099-02-02T01:00:00Z', second_lesson_at: '2099-02-04T01:00:00Z',
      option2_first_lesson_at: '2099-02-03T02:00:00Z', option2_second_lesson_at: '2099-02-05T02:00:00Z',
    })} />);
    expect(screen.getByText('옵션 1')).toBeTruthy();
    expect(screen.getByText('옵션 2')).toBeTruthy();
    expect(screen.getByText('02/02(월) 10:00')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '응답 수정하기' }));
    expect(inputs().map((i) => i.value)).toEqual(['2099-02-02T10:00', '2099-02-04T10:00', '2099-02-03T11:00', '2099-02-05T11:00']);
  });
});
