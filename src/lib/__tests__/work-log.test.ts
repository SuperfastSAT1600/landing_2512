import { describe, it, expect } from 'vitest';
import { formatSlackText, isWorkMessage, toWorkItem } from '@/lib/work-log';

const names = { U1AAA: '병윤', U2BBB: '민재', U3CCC: '우' };

describe('isWorkMessage', () => {
  it('일반 글과 첨부 글은 할 일이고 입장 알림·삭제 흔적은 아니다', () => {
    expect(isWorkMessage({ ts: '1.1' })).toBe(true);
    expect(isWorkMessage({ ts: '1.1', subtype: 'file_share' })).toBe(true);
    expect(isWorkMessage({ ts: '1.1', subtype: 'channel_join' })).toBe(false);
    expect(isWorkMessage({ ts: '1.1', subtype: 'tombstone' })).toBe(false);
  });
});

describe('formatSlackText', () => {
  it('태그·링크·이스케이프를 읽을 수 있게 바꾼다', () => {
    expect(formatSlackText('<@U1AAA> <https://a.com|자료> &amp; <https://b.com> <!here>', names)).toBe('@병윤 자료 & https://b.com @here');
  });

  it('이름을 모르는 태그는 ID 로 둔다', () => {
    expect(formatSlackText('<@U9ZZZ> 확인', names)).toBe('@U9ZZZ 확인');
  });
});

describe('toWorkItem', () => {
  const message = { ts: '1793840353.287059', user: 'U1AAA', text: '<@U2BBB> <@U3CCC> 남윤지 배정', reply_count: 2, files: [{}] };

  it('태그된 사람이 담당자이고 ✅ 가 없으면 진행 중이다', () => {
    const item = toWorkItem(message, names);
    expect(item).toMatchObject({ authorName: '병윤', assignees: ['민재', '우'], done: false, doneBy: null, replyCount: 2, fileCount: 1 });
    expect(item.permalink).toBe('https://slack.com/archives/C0C9B0DEGDN/p1793840353287059');
  });

  it('✅ 를 처음 단 사람이 완료자다. 다른 반응은 완료가 아니다', () => {
    expect(toWorkItem({ ...message, reactions: [{ name: 'eyes', users: ['U3CCC'] }] }, names).done).toBe(false);
    const done = toWorkItem({ ...message, reactions: [{ name: 'white_check_mark', users: ['U3CCC', 'U1AAA'] }] }, names);
    expect(done).toMatchObject({ done: true, doneBy: '우' });
  });
});
