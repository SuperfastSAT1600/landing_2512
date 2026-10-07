import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { summarizeTranscriptWithQwen, QuotaExhaustedError } from '@/lib/plaud-transcribe';
import { submitAsrTask, checkAsrTask, AsrFailedError, ASR_MODEL } from '@/lib/qwen-asr';
import { getPlaudFile, getAccountLabel } from '@/lib/plaud-client';
import { appendConsultationEntry, StudentNotFoundError } from '@/lib/consultation-timeline';
import { notifyMemoToSlack, PLAUD_MEMO_HEADING } from '@/lib/slack-memo';
import { PLAUD_MEMO_MARKER, toKstDisplay } from '@/lib/plaud-backfill';
import { insertCallTranscript } from '@/lib/call-transcripts';

// 요약(PUT)이 긴 전사문에서 수십 초 걸릴 수 있다. 전사 대기는 더 이상 여기서 하지 않는다.
export const maxDuration = 300;

/** 에러 → 응답 매핑. 동기 경로(../route.ts)와 같은 규칙을 쓴다. */
function errorResponse(e: unknown): NextResponse {
  if (e instanceof AsrFailedError) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
  if (e instanceof QuotaExhaustedError) {
    return NextResponse.json({ error: e.message }, { status: 402 });
  }
  if (e instanceof StudentNotFoundError) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }
  console.error('[crm/plaud-memo job]', e);
  return NextResponse.json({ error: 'Failed to process recording' }, { status: 500 });
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * POST /api/crm/students/[id]/plaud-memo/job
 * Plaud 녹음의 전사 작업을 **제출만** 하고 task_id를 즉시 돌려준다.
 *
 * 전사 완료까지 한 요청에서 기다리면(기존 ../route.ts) DashScope 큐 지연 편차를
 * 서버리스 실행 한도가 못 버티고, 재시도할 때마다 돌고 있는 작업을 버리게 된다.
 * 대기는 클라이언트가 PUT 폴링으로 한다.
 *
 * Body: { file_id, account_key } 또는 { audio_url, recording_name?, recorded_at? }
 * Requires admin authentication.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let audioUrl = str(body.audio_url);
  let recordingName = str(body.recording_name);
  let recordedAt = str(body.recorded_at);
  const accountKey = str(body.account_key);
  const fileId = str(body.file_id);
  let durationSec: number | undefined;

  if (!audioUrl && fileId) {
    if (!accountKey) {
      return NextResponse.json({ error: 'file_id 사용 시 account_key가 필요합니다.' }, { status: 400 });
    }
    try {
      const file = await getPlaudFile(fileId, accountKey);
      audioUrl = file.presigned_url;
      recordingName = recordingName || file.name;
      recordedAt = recordedAt || file.start_at || '';
      if (typeof file.duration === 'number') durationSec = Math.round(file.duration / 1000);
    } catch (e) {
      console.error('[crm/plaud-memo job get_file]', e);
      return NextResponse.json({ error: 'Plaud 녹음을 가져오지 못했습니다.' }, { status: 502 });
    }
  }

  if (!audioUrl) {
    return NextResponse.json({ error: 'file_id 또는 audio_url이 필요합니다.' }, { status: 400 });
  }

  try {
    const taskId = await submitAsrTask(audioUrl);
    // 메타는 클라이언트가 들고 있다가 PUT 때 돌려준다 — 작업 테이블을 따로 두지 않는다.
    return NextResponse.json(
      {
        data: {
          task_id: taskId,
          recording_name: recordingName,
          recorded_at: recordedAt,
          ...(durationSec !== undefined ? { duration_sec: durationSec } : {}),
        },
      },
      { status: 202 }
    );
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * PUT /api/crm/students/[id]/plaud-memo/job
 * 제출한 전사 작업을 한 번 조회한다. 아직이면 running, 끝났으면 요약·저장까지 마친다.
 *
 * Body: { task_id, account_key?, file_id?, recording_name?, recorded_at?, duration_sec? }
 * Requires admin authentication.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const taskId = str(body.task_id);
  if (!taskId) {
    return NextResponse.json({ error: 'task_id가 필요합니다.' }, { status: 400 });
  }

  const recordingName = str(body.recording_name);
  const recordedAt = str(body.recorded_at);
  const accountKey = str(body.account_key);
  const fileId = str(body.file_id);
  const durationSec = typeof body.duration_sec === 'number' ? body.duration_sec : undefined;

  try {
    const check = await checkAsrTask(taskId);
    if (check.status === 'running') {
      return NextResponse.json({ data: { status: 'running' } }, { status: 200 });
    }

    const { transcript, summary } = await summarizeTranscriptWithQwen(check.text);

    const meta = [recordingName, toKstDisplay(recordedAt)].filter(Boolean).join(' · ');
    const header = meta ? `${PLAUD_MEMO_MARKER} · ${meta}` : PLAUD_MEMO_MARKER;
    const raw_memo = `${header}\n\n${summary}`;

    const author = accountKey ? getAccountLabel(accountKey) : undefined;
    const entry = await appendConsultationEntry(id, { raw_memo, author, published: false });

    // 전사 원문·슬랙은 부차적 — 실패해도 메모를 되돌리지 않는다(동기 경로와 동일).
    try {
      await insertCallTranscript({
        studentId: id,
        timelineEntryId: entry.id,
        source: 'plaud',
        ...(fileId ? { externalId: fileId } : {}),
        ...(recordingName ? { recordingName } : {}),
        ...(recordedAt ? { recordedAt } : {}),
        ...(durationSec !== undefined ? { durationSec } : {}),
        transcript,
        asrModel: ASR_MODEL,
      });
    } catch (e) {
      console.error('[crm/plaud-memo job call_transcripts]', e);
    }

    try {
      await notifyMemoToSlack({
        studentId: id,
        author,
        heading: PLAUD_MEMO_HEADING,
        memo: meta ? `_${meta}_\n\n${summary}` : summary,
      });
    } catch (e) {
      console.error('[crm/plaud-memo job slack]', e);
    }

    return NextResponse.json({ data: { status: 'done', entry, summary } }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
