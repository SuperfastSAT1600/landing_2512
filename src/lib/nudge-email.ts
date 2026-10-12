import { Resend } from 'resend';

const REPLY_DOMAIN = 'argonautai.co.kr';
const FROM = 'SuperfastSAT <noreply@argonautai.co.kr>';

export interface NudgeTarget {
  sfv2ProfileId: string;
  name: string;
  email: string;
  userType: 'student' | 'coach';
  missingItems?: string[]; // student only: ['코치룸', '스터디홀', '보캡']
}

function replyTo(profileId: string): string {
  return `nudge+${profileId}@${REPLY_DOMAIN}`;
}

function studentSubject(missing: string[]): string {
  return `[SuperfastSAT] ${missing.join('·')} 스케줄을 아직 잡지 않으셨어요`;
}

function studentHtml(name: string, missing: string[]): string {
  const items = missing.map(m => `<li style="margin:4px 0;">📌 <b>${m}</b></li>`).join('');
  return `
<div style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:520px;margin:0 auto;color:#111;">
  <div style="background:#071be9;padding:20px 24px;border-radius:12px 12px 0 0;">
    <span style="color:#fff;font-size:18px;font-weight:700;">SuperfastSAT</span>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:28px 24px;border-radius:0 0 12px 12px;">
    <p style="margin:0 0 12px;font-size:16px;">안녕하세요 <b>${name}</b>님 👋</p>
    <p style="margin:0 0 20px;color:#444;line-height:1.6;">
      아직 아래 스케줄이 등록되지 않았어요.<br/>
      지금 바로 잡으면 학습 흐름을 이어갈 수 있어요!
    </p>
    <ul style="margin:0 0 24px;padding-left:20px;color:#111;font-size:15px;">
      ${items}
    </ul>
    <a href="https://v2.superfastsat.com/schedule"
       style="display:inline-block;padding:12px 28px;background:#071be9;color:#fff;
              text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
      스케줄 잡으러 가기 →
    </a>
    <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;"/>
    <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">
      일정이 생겨서 지금 잡기 어려우신가요?<br/>
      이 메일에 <b>간단히 답장</b>해주시면 연락 주기를 조정해 드릴게요.<br/>
      예) "이번 주말에 잡을게요", "다음 주에 연락해주세요"
    </p>
  </div>
</div>`;
}

function coachHtml(name: string): string {
  return `
<div style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:520px;margin:0 auto;color:#111;">
  <div style="background:#071be9;padding:20px 24px;border-radius:12px 12px 0 0;">
    <span style="color:#fff;font-size:18px;font-weight:700;">SuperfastSAT</span>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:28px 24px;border-radius:0 0 12px 12px;">
    <p style="margin:0 0 12px;font-size:16px;">안녕하세요 <b>${name}</b> 코치님 👋</p>
    <p style="margin:0 0 20px;color:#444;line-height:1.6;">
      담당 학생의 <b>코치룸 세션</b>이 아직 예정돼 있지 않아요.<br/>
      학생과 일정을 조율해 코치룸 세션을 등록해 주세요.
    </p>
    <a href="https://v2.superfastsat.com/coach/schedule"
       style="display:inline-block;padding:12px 28px;background:#071be9;color:#fff;
              text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
      코치룸 일정 등록하기 →
    </a>
    <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;"/>
    <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">
      일정 조율 중이시거나 다른 사정이 있으시면<br/>
      이 메일에 <b>답장</b>해 주세요. 연락 주기를 조정해 드릴게요.
    </p>
  </div>
</div>`;
}

function snoozeConfirmHtml(name: string, snoozeUntil: Date, reason: string): string {
  const dateStr = snoozeUntil.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' });
  return `
<div style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:520px;margin:0 auto;color:#111;">
  <div style="background:#071be9;padding:20px 24px;border-radius:12px 12px 0 0;">
    <span style="color:#fff;font-size:18px;font-weight:700;">SuperfastSAT</span>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:28px 24px;border-radius:0 0 12px 12px;">
    <p style="margin:0 0 12px;font-size:16px;">안녕하세요 <b>${name}</b>님 👋</p>
    <p style="margin:0 0 16px;color:#444;line-height:1.6;">
      답장 감사해요! 말씀하신 내용을 확인했어요.<br/>
      <b>${dateStr}</b>까지는 알림을 보내지 않을게요.
    </p>
    <div style="background:#f3f4f6;border-radius:8px;padding:14px 18px;color:#555;font-size:14px;line-height:1.5;">
      📝 <i>"${reason}"</i>
    </div>
  </div>
</div>`;
}

export async function sendNudgeEmail(target: NudgeTarget): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { sfv2ProfileId, name, email, userType, missingItems } = target;

  const isStudent = userType === 'student';
  const subject = isStudent
    ? studentSubject(missingItems ?? [])
    : `[SuperfastSAT] 코치룸 세션을 아직 등록하지 않으셨어요`;
  const html = isStudent
    ? studentHtml(name, missingItems ?? [])
    : coachHtml(name);

  await resend.emails.send({
    from: FROM,
    to: email,
    subject,
    html,
    reply_to: replyTo(sfv2ProfileId),
  });
}

export async function sendSnoozeConfirmEmail(
  target: Pick<NudgeTarget, 'sfv2ProfileId' | 'name' | 'email'>,
  snoozeUntil: Date,
  reason: string,
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    to: target.email,
    subject: '[SuperfastSAT] 알림 일시정지 확인',
    html: snoozeConfirmHtml(target.name, snoozeUntil, reason),
    reply_to: replyTo(target.sfv2ProfileId),
  });
}
