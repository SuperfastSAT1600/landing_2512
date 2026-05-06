import { NextResponse } from 'next/server';
import { notifyTestSubmission } from '@/lib/slack';

/**
 * POST /api/admin/diagnosis/test-slack
 * Slack webhook 연결 상태 확인용 테스트 엔드포인트
 */
export async function POST() {
  try {
    await notifyTestSubmission({
      studentName: '[테스트] Slack 연결 확인',
      studentEmail: 'test@superfastsat.com',
      submittedAt: new Date().toISOString(),
      resultId: 'test-result-id',
    });
    return NextResponse.json({ ok: true, message: 'Slack 전송 성공' });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
