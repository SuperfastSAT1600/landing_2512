/**
 * 학생 배정 요청 글에 붙는 업무 체크리스트.
 * 상태는 Slack 메시지(체크박스 initial_options + 항목 설명)에 담아 DB 없이 유지한다.
 */
export const ASSIGNMENT_CHANNEL = 'C0C9B0DEGDN';
export const CHECKLIST_ACTION_ID = 'assignment_checklist';

export const ASSIGNMENT_TASKS = [
  { id: 't1', label: '진단테스트 필요시 진단테스트 실시' },
  { id: 't2', label: '회원 가입 확인' },
  { id: 't3', label: '상담 정보 코치에게 전달' },
  { id: 't4', label: '코치의 첫 수업/두번째 수업 가능 스케줄 단톡방에 확인' },
  { id: 't5', label: '코치 초대' },
  { id: 't6', label: '코치와 학생 첫 수업 스케줄 재확인 요청' },
  { id: 't7', label: '코치와 학생 매칭' },
  { id: 't8', label: '코치가 스케줄 등록' },
  { id: 't9', label: '단톡방에 학생 스케줄 링크 공지사항에 올려주기' },
] as const;

/** 체크된 항목 id → 설명("✔ 사용자 MM/DD HH:mm"). 없으면 미체크 */
export type CheckedMap = Record<string, string>;

type SlackText = { type: 'plain_text' | 'mrkdwn'; text: string };
type SlackOption = { text: SlackText; value: string; description?: SlackText };
export type ChecklistBlock = {
  type: string;
  text?: SlackText;
  elements?: { type: string; action_id: string; options?: SlackOption[]; initial_options?: SlackOption[] }[];
};

type RequestEvent = { type?: string; bot_id?: string; subtype?: string; channel?: string; ts?: string; thread_ts?: string; text?: string };

export function isAssignmentRequest(event: RequestEvent): boolean {
  if (event.type !== 'message' || event.channel !== ASSIGNMENT_CHANNEL) return false;
  if (event.subtype && event.subtype !== 'bot_message') return false;
  if (event.thread_ts && event.thread_ts !== event.ts) return false;
  return (event.text ?? '').includes('배정');
}

function toOption(task: (typeof ASSIGNMENT_TASKS)[number], note?: string): SlackOption {
  const option: SlackOption = { text: { type: 'mrkdwn', text: task.label }, value: task.id };
  if (note) option.description = { type: 'plain_text', text: note.slice(0, 75) };
  return option;
}

export function buildChecklistBlocks(checked: CheckedMap): ChecklistBlock[] {
  const options = ASSIGNMENT_TASKS.map((t) => toOption(t, checked[t.id]));
  const done = options.filter((o) => checked[o.value]);
  const element = {
    type: 'checkboxes',
    action_id: CHECKLIST_ACTION_ID,
    options,
    ...(done.length ? { initial_options: done } : {}),
  };
  const blocks: ChecklistBlock[] = [
    { type: 'section', text: { type: 'mrkdwn', text: `*학생 배정 업무* (${done.length}/${options.length})` } },
    { type: 'actions', elements: [element] },
  ];
  if (done.length === options.length) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '✅ *배정 업무 완료*' } });
  }
  return blocks;
}

function kstStamp(now: Date): string {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`;
}

/** 이전 체크 상태에 이번 선택을 반영: 새 체크는 기록, 해제는 삭제, 유지는 그대로 */
export function applyToggle(prev: CheckedMap, selected: string[], user: string, now: Date): CheckedMap {
  const next: CheckedMap = {};
  for (const id of selected) next[id] = prev[id] ?? `✔ ${user} ${kstStamp(now)}`;
  return next;
}

async function slackCall(method: string, payload: Record<string, unknown>): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return;
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) console.error(`[slack/assignment-checklist] ${method} 실패:`, data.error);
}

export function postChecklist(channel: string, threadTs: string): Promise<void> {
  return slackCall('chat.postMessage', {
    channel, thread_ts: threadTs, text: '학생 배정 업무 체크리스트', blocks: buildChecklistBlocks({}),
  });
}

export function updateChecklist(channel: string, ts: string, checked: CheckedMap): Promise<void> {
  return slackCall('chat.update', { channel, ts, text: '학생 배정 업무 체크리스트', blocks: buildChecklistBlocks(checked) });
}

/** 메시지의 기존 체크박스(initial_options)에서 이전 체크 상태를 읽는다 */
export function readCheckedMap(blocks: unknown[] | undefined): CheckedMap {
  const el = (blocks as ChecklistBlock[] | undefined)
    ?.find((b) => b.type === 'actions')?.elements?.find((e) => e.action_id === CHECKLIST_ACTION_ID);
  const map: CheckedMap = {};
  for (const o of el?.initial_options ?? []) map[o.value] = o.description?.text ?? '✔';
  return map;
}
