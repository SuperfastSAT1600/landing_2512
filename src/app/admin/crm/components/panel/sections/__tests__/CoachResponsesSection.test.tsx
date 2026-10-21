// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { CoachResponsesSection } from '../CoachResponsesSection';
import { SCHEDULE_PROMPT_EN, SCHEDULE_PROMPT_KO } from '@/lib/coach-prep-student-message';

const LINK = 'https://app.superfastsat.io/report/abcDEF123_-xyz456789AB';
const row = (over: Record<string, unknown> = {}) => ({
  id: 'r1', student_id: 's1', coach_slug: 'jas', coach_name: 'Jasmine', token: 'tok', deadline_at: '2099-01-01T00:00:00Z',
  status: 'accepted', first_lesson_at: '2026-10-26T10:00:00+09:00', second_lesson_at: '2026-10-28T10:00:00+09:00',
  option2_first_lesson_at: null, option2_second_lesson_at: null, decline_reason: null,
  first_opened_at: null, responded_at: null, selected_at: null, created_at: '2026-10-20T00:00:00Z', ...over,
});

function mockApi(requests: unknown[], student_context: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: { requests, student_context } }) })));
}
const open = async () => {
  render(<CoachResponsesSection studentId="s1" adminKey="k" version={0} />);
  fireEvent.click(await screen.findByText('학생 안내 메시지'));
  return screen.getByTestId('student-message').textContent ?? '';
};

describe('CoachResponsesSection 학생 안내 메시지', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  // REQ-004
  it('영어 학생: 학생 시간대 일정과 영어 안내문, 링크가 나온다', async () => {
    mockApi([row()], { language: 'english', timezone: 'America/New_York', schedule_url: LINK });
    const text = await open();
    expect(text).toContain('Option 1: 1st lesson Sun 10/25, 9:00 PM');
    expect(text).toContain(SCHEDULE_PROMPT_EN);
    expect(text).toContain(LINK);
  });

  it('한국어 학생: 한국어 안내문이 나온다', async () => {
    mockApi([row()], { language: 'korean', timezone: 'America/New_York', schedule_url: LINK });
    const text = await open();
    expect(text).toContain('옵션 1: 첫 수업 10/25(일) 오후 9:00');
    expect(text).toContain(SCHEDULE_PROMPT_KO);
  });

  it('시간대·링크를 못 구하면 KST 표기와 함께 담당자에게 알려준다', async () => {
    mockApi([row()], { language: 'korean', timezone: null, schedule_url: null });
    await open();
    expect(screen.getByText(/한국 시간\(KST\)으로 표기/)).toBeTruthy();
    expect(screen.getByText(/링크를 찾지 못해/)).toBeTruthy();
  });

  it('수락하지 않았거나 일정이 없는 코치에게는 버튼이 없다', async () => {
    mockApi([row({ status: 'declined', first_lesson_at: null, second_lesson_at: null })], null);
    render(<CoachResponsesSection studentId="s1" adminKey="k" version={0} />);
    await waitFor(() => expect(screen.getByText('Jasmine')).toBeTruthy());
    expect(screen.queryByText('학생 안내 메시지')).toBeNull();
  });

  it('student_context가 없어도(조회 실패) 메시지는 만들어진다', async () => {
    mockApi([row()], null);
    const text = await open();
    expect(text).toContain('Jasmine 코치님');
  });

  it('메시지 복사: 클립보드에 메시지를 쓰고 성공하면 "복사됨"을 보여준다', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    mockApi([row()], { language: 'korean', timezone: 'America/New_York', schedule_url: LINK });
    const text = await open();
    fireEvent.click(screen.getByText('메시지 복사'));
    await waitFor(() => expect(screen.getByText('복사됨')).toBeTruthy());
    expect(writeText).toHaveBeenCalledWith(text);
  });

  it('클립보드 쓰기가 거절되면 오류를 보여주고 "복사됨"은 나오지 않는다', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => { throw new Error('denied'); }) } });
    mockApi([row()], { language: 'korean', timezone: 'America/New_York', schedule_url: LINK });
    await open();
    fireEvent.click(screen.getByText('메시지 복사'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('복사하지 못했습니다'));
    expect(screen.queryByText('복사됨')).toBeNull();
  });
});
