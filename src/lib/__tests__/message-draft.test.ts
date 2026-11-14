// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { buildDraftContext, fillName, generateMessageDraft, NAME_SLOT } from '@/lib/message-draft';
import type { ContactLog } from '@/lib/staff-contacts';
import type { WorkItem } from '@/lib/work-log';

const now = new Date('2026-11-14T01:00:00.000Z'); // 11/14 10:00 KST
const log = (over: Partial<ContactLog>): ContactLog => ({
  id: 'c1', studentId: 's1', studentName: '가나다', contactedAt: '2026-11-12T05:00:00.000Z', staffId: 'x', staffName: '알바A',
  briefingDate: '2026-11-12', listKey: 'noSchedule', note: '문자로 스케줄 안내, 가나다 학생이 목요일에 잡겠다고 함', ...over,
});
const item = (over: Partial<WorkItem>): WorkItem => ({
  messageTs: '1.1', postedAt: '2026-11-13T04:00:00.000Z', text: '가나다 어머님과 통화. 이번 주 시험 기간', authorName: '직원A', assignees: [],
  done: true, doneBy: null, doneAt: null, permalink: '', replyCount: 0, fileCount: 0, student: null, dismissed: null, ...over,
});

// REQ-011
describe('buildDraftContext', () => {
  const student = { kind: 'student' as const, name: '가나다', remainingHours: 6, reasons: [
    { kind: 'coachRoom' as const, coachNames: ['Ben'] },
    { kind: 'endingSoon' as const, lastDate: '2026-11-15T10:00:00.000Z' },
    { kind: 'neverScheduled' as const, isNew: true },
  ] };

  it('용건·잔여 수업·코치·마지막 일정·신규 여부를 담고, 대상 이름은 자리표시로 바꾼다', () => {
    const ctx = buildDraftContext(student, [log({})], [item({})], now);
    expect(ctx).toContain('오늘: 2026-11-14');
    expect(ctx).toContain('잔여 수업 6시간');
    expect(ctx).toContain('코칭룸 미예약 (담당 코치 Ben)');
    expect(ctx).toContain('스터디홀/보캡 곧 끝남 (마지막 일정 11/15)');
    expect(ctx).toContain('신규');
    expect(ctx).toContain('11/12 14:00 알바A [스터디홀/보캡 없음] 문자로 스케줄 안내');
    expect(ctx).toContain('운영 업무 11/13 13:00 직원A (완료): {이름} 어머님과 통화');
    expect(ctx).not.toContain('가나다');
  });

  it('연락 이력은 최근 10건까지만 담는다', () => {
    const logs = Array.from({ length: 15 }, (_, i) => log({ id: `c${i}`, note: `기록${i}` }));
    const ctx = buildDraftContext(student, logs, [], now);
    expect(ctx).toContain('기록9');
    expect(ctx).not.toContain('기록10');
  });

  it('코치는 미예약 학생 목록을 담는다', () => {
    const ctx = buildDraftContext({ kind: 'coach', name: 'Ben', studentNames: ['라마', '바사'] }, [], [], now);
    expect(ctx).toContain('대상: 코치');
    expect(ctx).toContain('코칭룸 예약이 없는 담당 학생: 라마, 바사');
    expect(ctx).toContain('연락 이력: 없음');
    expect(ctx).not.toContain('Ben');
  });
});

describe('fillName', () => {
  it('자리표시를 이름으로 채운다', () => {
    expect(fillName(`${NAME_SLOT} 학생, 안녕하세요. ${NAME_SLOT} 학생`, '가나다')).toBe('가나다 학생, 안녕하세요. 가나다 학생');
  });
});

describe('generateMessageDraft', () => {
  const parsed = { message: `${NAME_SLOT} 학생 안녕하세요`, basis: ['코칭룸 미예약'], handoff: null };
  const client = (response: object) => ({ messages: { parse: vi.fn().mockResolvedValue(response) } });

  it('Opus 5.5 구조화 출력으로 초안·근거·넘김 사유를 받는다', async () => {
    const c = client({ stop_reason: 'end_turn', parsed_output: parsed });
    expect(await generateMessageDraft('ctx', c as never)).toEqual(parsed);
    const req = c.messages.parse.mock.calls[0][0];
    expect(req.model).toBe('claude-opus-5-5');
    expect(req.output_config.format).toBeTruthy();
    expect(req.messages).toEqual([{ role: 'user', content: 'ctx' }]);
    expect(req.system).toContain('결제');
  });

  it('거절되거나 형식이 깨지면 오류를 낸다', async () => {
    await expect(generateMessageDraft('ctx', client({ stop_reason: 'refusal', parsed_output: null }) as never)).rejects.toThrow();
    await expect(generateMessageDraft('ctx', client({ stop_reason: 'end_turn', parsed_output: null }) as never)).rejects.toThrow();
  });
});
