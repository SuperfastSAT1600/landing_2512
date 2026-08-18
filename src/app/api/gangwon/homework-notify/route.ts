import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const NOTIFY_RECIPIENTS = [
  'miraoma@naver.com',
  'baeby@argonautai.co.kr',
  'jangjuhyeong2006@gmail.com',
];

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[gangwon/homework-notify] RESEND_API_KEY not set');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { studentName, unit, experience, sentences, blanks, submittedAt } = body as {
    studentName?: string;
    unit?: string;
    experience?: string;
    sentences?: string[];
    blanks?: string[];
    submittedAt?: string;
  };

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const displayName = studentName || '(이름 없음)';
  const displayUnit = unit || '(유닛 없음)';
  const displayTime = submittedAt
    ? new Date(submittedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    : new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const sentenceRows = (sentences ?? [])
    .map(
      (s, i) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;width:80px;">문장 ${i + 1}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${s || '(미입력)'}</td>
      </tr>`
    )
    .join('');

  const blankRows = (blanks ?? [])
    .map(
      (b, i) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;width:80px;">빈칸 ${i + 1}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${b || '(미입력)'}</td>
      </tr>`
    )
    .join('');

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#1a8a3e;margin-bottom:4px;">강원FC 영어 인터뷰 — 숙제 제출 알림</h2>
      <p style="color:#666;margin-top:0;font-size:14px;">${displayTime} · ${displayUnit}</p>
      <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
        <tr>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;width:80px;">이름</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;">${displayName}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">유닛</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;">${displayUnit}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">제출 시각</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;">${displayTime}</td>
        </tr>
      </table>
      ${experience ? `<h3 style="color:#333;margin-bottom:8px;">인터뷰 경험 문장</h3><table style="border-collapse:collapse;width:100%;margin-bottom:16px;"><tr><td style="padding:8px 12px;border:1px solid #e5e7eb;">${experience}</td></tr></table>` : ''}
      ${sentenceRows ? `<h3 style="color:#333;margin-bottom:8px;">문장 쓰기</h3><table style="border-collapse:collapse;width:100%;margin-bottom:16px;">${sentenceRows}</table>` : ''}
      ${blankRows ? `<h3 style="color:#333;margin-bottom:8px;">빈칸 채우기</h3><table style="border-collapse:collapse;width:100%;margin-bottom:16px;">${blankRows}</table>` : ''}
    </div>
  `;

  await resend.emails.send({
    from: 'SuperfastSAT <onboarding@resend.dev>',
    to: NOTIFY_RECIPIENTS,
    subject: `[강원FC] ${displayName} — ${displayUnit} 숙제 제출`,
    html,
  });

  return NextResponse.json({ ok: true });
}
