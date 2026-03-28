import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface DiagnosticApplicationEmailData {
  name: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  createdAt: string;
}

export async function sendApplicationNotification(data: DiagnosticApplicationEmailData) {
  const { name, phone, preferredDate, preferredTime, createdAt } = data;

  await resend.emails.send({
    from: 'SuperfastSAT <onboarding@resend.dev>',
    to: 'baeby@argonautai.co.kr',
    subject: `[SuperfastSAT] 진단테스트 신청 - ${name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #071be9;">새로운 진단테스트 신청</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600; width: 120px;">이름</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">전화번호</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${phone}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">희망 날짜</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${preferredDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">희망 시간</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${preferredTime}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">신청 시각</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${new Date(createdAt).toLocaleString('ko-KR')}</td>
          </tr>
        </table>
        <br/>
        <a href="https://superfastsat.com/admin/diagnosis"
           style="display:inline-block;padding:10px 24px;background:#071be9;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          어드민에서 확인하기 →
        </a>
      </div>
    `,
  });
}
