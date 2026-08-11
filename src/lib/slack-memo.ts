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
