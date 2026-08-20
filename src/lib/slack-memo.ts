/**
 * CRM 상담 메모 슬랙 알림 (공통).
 * 직접 작성 메모(/memo)와 Plaud 녹음 자동 요약(/plaud-memo)이 같은 채널·형식으로 공유되도록 추출.
 * 전송 실패는 삼켜서 메모 저장에 영향을 주지 않는다.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';

const SLACK_CHANNEL = 'C0B8Q5WNDD3';

export const MEMO_HEADING = '📋 *상담 메모 등록*';
export const PLAUD_MEMO_HEADING = '🎙️ *Plaud 녹음 상담 메모*';

export async function notifyMemoToSlack(input: {
  studentId: string;
  memo: string;
  author?: string;
  /** 미지정 시 일반 상담 메모 제목. */
  heading?: string;
}): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return;

  try {
    const { data } = await supabaseAdmin
      .from('students')
      .select('name')
      .eq('id', input.studentId)
      .single();

    const studentName = data?.name ?? input.studentId;
    const now = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
    });
    const heading = input.heading ?? MEMO_HEADING;
    const text = `${heading} — ${now} KST\n*학생:* ${studentName}  |  *상담인:* ${input.author || '미기재'}\n\n${input.memo.trim()}`;

    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ channel: SLACK_CHANNEL, text }),
    });
  } catch (e) {
    console.error('[slack-memo]', e);
  }
}

export const WINBACK_SEND_HEADING = '📨 *윈백 발송*';

export interface WinbackSend {
  studentName: string;
  /** "{플레이} / {변형}" 표기 — 상담 메모·재활성화 로그와 같은 라벨. */
  playLabel: string;
  message?: string | null;
}

function quote(message: string): string {
  return message
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

/**
 * 윈백 발송으로 남은 상담 메모를 상담 채널에 공유한다.
 * 일괄 발송은 한 번에 수십 건이라 건별 메시지 대신 발송 1회당 슬랙 메시지 1건으로 묶고,
 * 같은 플레이·같은 문구끼리는 학생 명단 한 블록으로 합친다.
 */
export async function notifyWinbackSendsToSlack(input: {
  sends: WinbackSend[];
  author?: string | null;
}): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token || input.sends.length === 0) return;

  try {
    const now = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
    });

    const groups = new Map<string, { playLabel: string; message: string; names: string[] }>();
    for (const send of input.sends) {
      const message = (send.message ?? '').trim();
      const key = `${send.playLabel} ${message}`;
      const group = groups.get(key) ?? { playLabel: send.playLabel, message, names: [] };
      group.names.push(send.studentName);
      groups.set(key, group);
    }

    const head = `${WINBACK_SEND_HEADING} — ${now} KST\n*발송인:* ${input.author || '미기재'}  |  *대상:* ${input.sends.length}명`;
    const blocks = [...groups.values()].map((g) => {
      const title = `*${g.playLabel}* (${g.names.length}명)\n${g.names.join(', ')}`;
      return g.message ? `${title}\n${quote(g.message)}` : title;
    });

    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ channel: SLACK_CHANNEL, text: [head, ...blocks].join('\n\n') }),
    });
  } catch (e) {
    console.error('[slack-memo winback]', e);
  }
}
