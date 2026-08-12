import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { processPlaudRecording } from '@/lib/plaud-process';
import { QuotaExhaustedError } from '@/lib/plaud-transcribe';
import { AsrFailedError } from '@/lib/qwen-asr';
import { getPlaudFile, getAccountLabel } from '@/lib/plaud-client';
import { appendConsultationEntry, StudentNotFoundError } from '@/lib/consultation-timeline';
import { notifyMemoToSlack, PLAUD_MEMO_HEADING } from '@/lib/slack-memo';

// 전사 작업 폴링(상한 240s)에 시간이 걸릴 수 있어 서버리스 실행 한도를 늘린다.
export const maxDuration = 300;

const MEMO_HEADER = '🎙️ Plaud 상담 자동 요약';

/**
 * Plaud의 타임스탬프(start_at 등)를 한국시간(KST) "YYYY-MM-DD HH:mm"로 변환한다.
 * Plaud는 타임존 표기 없는 UTC 문자열(예: "2026-07-31T07:39:18")을 주므로 UTC로 간주해 +9h 한다.
 * 파싱 불가하면 원본을 그대로 반환한다.
 */
function toKstDisplay(iso: string): string {
  if (!iso) return '';
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  const d = new Date(hasTz ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${kst.getUTCFullYear()}-${p(kst.getUTCMonth() + 1)}-${p(kst.getUTCDate())} ${p(kst.getUTCHours())}:${p(kst.getUTCMinutes())}`;
}

/**
 * POST /api/crm/students/[id]/plaud-memo
 * Plaud 녹음을 Qwen 전사(화자분리) → Qwen 4섹션 요약 → consultation_timeline에
 * 미공개(published:false) 초안으로 추가한다.
 *
 * Body(둘 중 하나):
 *   { file_id, account_key }             — 서버가 해당 계정 Plaud MCP로 오디오 URL·이름·일시를 해석(권장, UI 경로)
 *   { audio_url, recording_name?, recorded_at?, account_key? } — presigned URL 직접 전달(back-compat)
 * account_key가 오면 그 계정 소유자를 상담자(author)로 메모에 기록한다.
 * Requires admin authentication.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    audio_url?: unknown;
    recording_name?: unknown;
    recorded_at?: unknown;
    file_id?: unknown;
    account_key?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let audioUrl = typeof body.audio_url === 'string' ? body.audio_url.trim() : '';
  let recordingName = typeof body.recording_name === 'string' ? body.recording_name.trim() : '';
  let recordedAt = typeof body.recorded_at === 'string' ? body.recorded_at.trim() : '';
  const accountKey = typeof body.account_key === 'string' ? body.account_key.trim() : '';

  // file_id가 오면 서버가 해당 계정 Plaud MCP로 presigned URL·메타를 해석한다(오디오 URL이 브라우저에 노출되지 않음).
  const fileId = typeof body.file_id === 'string' ? body.file_id.trim() : '';
  if (!audioUrl && fileId) {
    // 어느 계정 녹음인지 알아야 올바른 토큰으로 조회 가능 — file_id 경로에선 account_key 필수.
    if (!accountKey) {
      return NextResponse.json({ error: 'file_id 사용 시 account_key가 필요합니다.' }, { status: 400 });
    }
    try {
      const file = await getPlaudFile(fileId, accountKey);
      audioUrl = file.presigned_url;
      recordingName = recordingName || file.name;
      recordedAt = recordedAt || file.start_at || '';
    } catch (e) {
      console.error('[crm/plaud-memo get_file]', e);
      return NextResponse.json({ error: 'Plaud 녹음을 가져오지 못했습니다.' }, { status: 502 });
    }
  }

  if (!audioUrl) {
    return NextResponse.json({ error: 'file_id 또는 audio_url이 필요합니다.' }, { status: 400 });
  }

  try {
    const { summary } = await processPlaudRecording({ audioUrl });

    const meta = [recordingName, toKstDisplay(recordedAt)].filter(Boolean).join(' · ');
    const header = meta ? `${MEMO_HEADER} · ${meta}` : MEMO_HEADER;
    const raw_memo = `${header}\n\n${summary}`;

    // account_key가 있으면 그 계정 소유자를 상담자(author)로 기록(누가 통화했는지 추적).
    const author = accountKey ? getAccountLabel(accountKey) : undefined;
    const entry = await appendConsultationEntry(id, { raw_memo, author, published: false });

    // 직접 작성 메모와 동일하게 슬랙 상담 채널에 공유 (실패해도 메모는 이미 저장됨)
    try {
      await notifyMemoToSlack({
        studentId: id,
        author,
        heading: PLAUD_MEMO_HEADING,
        memo: meta ? `_${meta}_\n\n${summary}` : summary,
      });
    } catch (e) {
      console.error('[crm/plaud-memo slack]', e);
    }

    return NextResponse.json({ data: { entry, summary } }, { status: 201 });
  } catch (e) {
    // 전사 실패(작업 실패·타임아웃) — 원인을 그대로 노출해 재시도 여부를 판단하게 한다.
    if (e instanceof AsrFailedError) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    // 크레딧 소진 — 재시도해도 안 되니 원인을 그대로 알려준다.
    if (e instanceof QuotaExhaustedError) {
      return NextResponse.json({ error: e.message }, { status: 402 });
    }
    if (e instanceof StudentNotFoundError) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    console.error('[crm/plaud-memo POST]', e);
    return NextResponse.json({ error: 'Failed to create memo from recording' }, { status: 500 });
  }
}
