// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const single = vi.fn();
const eq = vi.fn(() => ({ single }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from } }));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function slackBody() {
  const [, init] = fetchMock.mock.calls[0];
  return JSON.parse((init as RequestInit).body as string) as { channel: string; text: string };
}

describe('notifyMemoToSlack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLACK_BOT_TOKEN = 'xoxb-test';
    single.mockResolvedValue({ data: { name: '홍길동' } });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  });

  it('학생 이름·상담인·메모 본문을 담아 상담 채널로 전송', async () => {
    const { notifyMemoToSlack } = await import('@/lib/slack-memo');

    await notifyMemoToSlack({ studentId: 's1', memo: '수학 보강 요청', author: '이민재' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    const body = slackBody();
    expect(body.text).toContain('홍길동');
    expect(body.text).toContain('이민재');
    expect(body.text).toContain('수학 보강 요청');
    expect(body.text).toContain('상담 메모 등록');
  });

  it('heading을 주면 그 제목으로 전송 (Plaud 구분)', async () => {
    const { notifyMemoToSlack } = await import('@/lib/slack-memo');

    await notifyMemoToSlack({
      studentId: 's1',
      memo: '[핵심 니즈]\n- 1600 목표',
      author: '김우영',
      heading: '🎙️ *Plaud 녹음 상담 메모*',
    });

    const body = slackBody();
    expect(body.text).toContain('🎙️ *Plaud 녹음 상담 메모*');
    expect(body.text).toContain('1600 목표');
  });

  it('author 미지정 → "미기재"', async () => {
    const { notifyMemoToSlack } = await import('@/lib/slack-memo');
    await notifyMemoToSlack({ studentId: 's1', memo: '메모' });
    expect(slackBody().text).toContain('미기재');
  });

  it('학생 조회 실패해도 studentId 폴백으로 전송', async () => {
    single.mockResolvedValue({ data: null });
    const { notifyMemoToSlack } = await import('@/lib/slack-memo');
    await notifyMemoToSlack({ studentId: 's1', memo: '메모' });
    expect(slackBody().text).toContain('s1');
  });

  it('SLACK_BOT_TOKEN 없으면 전송하지 않음', async () => {
    delete process.env.SLACK_BOT_TOKEN;
    const { notifyMemoToSlack } = await import('@/lib/slack-memo');
    await notifyMemoToSlack({ studentId: 's1', memo: '메모' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('전송 실패해도 throw 하지 않음(메모 저장에 영향 없음)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('slack down'));
    const { notifyMemoToSlack } = await import('@/lib/slack-memo');
    await expect(notifyMemoToSlack({ studentId: 's1', memo: '메모' })).resolves.toBeUndefined();
  });
});

describe('notifyWinbackSendsToSlack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLACK_BOT_TOKEN = 'xoxb-test';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  });

  it('여러 건을 슬랙 메시지 1건으로 묶어 전송(같은 문구는 한 블록)', async () => {
    const { notifyWinbackSendsToSlack } = await import('@/lib/slack-memo');

    await notifyWinbackSendsToSlack({
      author: 'Ethan',
      sends: [
        { studentName: 'Sylvie Kim', playLabel: 'AP 과목 선정 상담 / 기본', message: '안녕하세요 어머님' },
        { studentName: '손호원', playLabel: 'AP 과목 선정 상담 / 기본', message: '안녕하세요 어머님' },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = slackBody();
    expect(body.channel).toBe('C0B8Q5WNDD3');
    expect(body.text).toContain('윈백 발송');
    expect(body.text).toContain('Ethan');
    expect(body.text).toContain('2명');
    expect(body.text).toContain('Sylvie Kim, 손호원');
    expect(body.text).toContain('AP 과목 선정 상담 / 기본');
    expect(body.text).toContain('> 안녕하세요 어머님');
    // 같은 문구는 한 번만 인용된다
    expect(body.text.match(/> 안녕하세요 어머님/g)).toHaveLength(1);
  });

  it('문구가 다르면 블록을 나눠 한 메시지에 담는다', async () => {
    const { notifyWinbackSendsToSlack } = await import('@/lib/slack-memo');

    await notifyWinbackSendsToSlack({
      sends: [
        { studentName: '지수현', playLabel: '윈백 / 기본', message: '문구 A' },
        { studentName: '홍길동', playLabel: '윈백 / 변형', message: '문구 B' },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { text } = slackBody();
    expect(text).toContain('> 문구 A');
    expect(text).toContain('> 문구 B');
    expect(text).toContain('지수현');
    expect(text).toContain('홍길동');
  });

  it('여러 줄 문구는 각 줄을 인용 표시', async () => {
    const { notifyWinbackSendsToSlack } = await import('@/lib/slack-memo');
    await notifyWinbackSendsToSlack({
      sends: [{ studentName: '홍길동', playLabel: '윈백', message: '첫 줄\n둘째 줄' }],
    });
    expect(slackBody().text).toContain('> 첫 줄\n> 둘째 줄');
  });

  it('문구가 없어도 학생·플레이는 전송', async () => {
    const { notifyWinbackSendsToSlack } = await import('@/lib/slack-memo');
    await notifyWinbackSendsToSlack({ sends: [{ studentName: '홍길동', playLabel: '윈백' }] });
    const { text } = slackBody();
    expect(text).toContain('홍길동');
    expect(text).not.toContain('>');
  });

  it('sends가 비면 전송하지 않음', async () => {
    const { notifyWinbackSendsToSlack } = await import('@/lib/slack-memo');
    await notifyWinbackSendsToSlack({ sends: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('SLACK_BOT_TOKEN 없으면 전송하지 않음', async () => {
    delete process.env.SLACK_BOT_TOKEN;
    const { notifyWinbackSendsToSlack } = await import('@/lib/slack-memo');
    await notifyWinbackSendsToSlack({ sends: [{ studentName: '홍길동', playLabel: '윈백' }] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('전송 실패해도 throw 하지 않음', async () => {
    fetchMock.mockRejectedValueOnce(new Error('slack down'));
    const { notifyWinbackSendsToSlack } = await import('@/lib/slack-memo');
    await expect(
      notifyWinbackSendsToSlack({ sends: [{ studentName: '홍길동', playLabel: '윈백' }] })
    ).resolves.toBeUndefined();
  });
});
