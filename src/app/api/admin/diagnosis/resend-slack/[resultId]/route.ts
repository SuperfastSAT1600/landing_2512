import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyTestSubmission } from '@/lib/slack';

/**
 * POST /api/admin/diagnosis/resend-slack/[resultId]
 * slack_sent_at이 null인 결과에 Slack 알림 재전송
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ resultId: string }> }
) {
  const { resultId } = await params;

  const { data: result, error } = await supabaseAdmin
    .from('diagnostic_test_results')
    .select('id, student_name, student_email, submitted_at')
    .eq('id', resultId)
    .single();

  if (error || !result) {
    return NextResponse.json({ error: 'Result not found' }, { status: 404 });
  }

  try {
    await notifyTestSubmission({
      studentName: result.student_name,
      studentEmail: result.student_email,
      submittedAt: result.submitted_at ?? new Date().toISOString(),
      resultId: result.id,
    });
    await supabaseAdmin
      .from('diagnostic_test_results')
      .update({ slack_sent_at: new Date().toISOString(), slack_error: null })
      .eq('id', resultId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await supabaseAdmin
      .from('diagnostic_test_results')
      .update({ slack_error: errMsg })
      .eq('id', resultId);

    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
