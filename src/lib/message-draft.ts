// 수업 관리 업무의 메시지 초안 에이전트. 학생·코치의 용건과 연락 이력을 근거로 보낼 메시지 초안을 만든다.
// 발송은 사람이 한다. 대상 이름은 자리표시로 보내고 돌려받은 뒤 채운다. 서버 전용.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { formatKstDateTime, formatKstMonthDay } from '@/app/staff/briefing/format';
import { reasonLabel, type Reason } from '@/lib/contact-tasks';
import { kstDate } from '@/lib/kst-date';
import type { ContactLog } from '@/lib/staff-contacts';
import type { WorkItem } from '@/lib/work-log';

export const NAME_SLOT = '{이름}';
export const DRAFT_MODEL = 'claude-opus-5-5';
const MAX_CONTACTS = 10;
const MAX_WORK_ITEMS = 5;

export type DraftTarget =
  | { kind: 'student'; name: string; remainingHours: number; reasons: Reason[] }
  | { kind: 'coach'; name: string; studentNames: string[] };

const DraftSchema = z.object({
  message: z.string(),
  basis: z.array(z.string()),
  handoff: z.string().nullable(),
});
export type MessageDraft = z.infer<typeof DraftSchema>;

const SYSTEM = `당신은 SAT 학원 SuperfastSAT 운영팀의 메시지 초안 작성자입니다. 운영 근무자가 학생(또는 학부모)이나 코치에게 보낼 문자 메시지 초안을 씁니다. 근무자가 읽고 고쳐서 직접 보냅니다.

용건의 뜻:
- 코칭룸 미예약: 담당 코치와 하는 1:1 수업(코칭룸)을 예약하지 않았고, 남은 수업 시간이 있습니다.
- 스터디홀/보캡 곧 끝남: 잡아 둔 스터디홀·보캡짐 일정이 곧 끝나고 그 뒤 일정이 없습니다.
- 스터디홀/보캡 없음: 예전에는 잡았지만 지금은 잡힌 일정이 없습니다.
- 스터디홀/보캡 한 번도 안 잡음: 한 번도 잡은 적이 없습니다. 신규 학생이면 첫 일정을 잡도록 친절하게 안내합니다.
- 코치 연락: 코치에게 코칭룸을 예약하지 않은 담당 학생이 있음을 알리고 학생 예약을 도와 달라고 부탁합니다.

쓰는 법:
- 한국어 존댓말로, 문자로 바로 보낼 수 있게 3~5문장으로 짧게 씁니다. 해당하는 용건을 한 메시지에 함께 담습니다.
- 받는 사람 이름은 반드시 ${NAME_SLOT} 로 씁니다. 예: "${NAME_SLOT} 학생, 안녕하세요." / "${NAME_SLOT} 코치님, 안녕하세요."
- 연락 이력을 반영합니다. 학생이 한 약속(예: 목요일에 잡겠다)이 있으면 그 약속을 이어서 묻고, 이미 같은 안내를 여러 번 보냈으면 같은 문장을 반복하지 말고 어려운 점이 있는지 묻습니다. 연락 창구가 학부모로 기록되어 있으면 학부모에게 보내는 말투로 씁니다.
- 주어진 정보에 없는 사실, 날짜, 링크, 가격, 할인, 환불, 결제, 코치 변경 약속은 쓰지 않습니다.

basis: 이 초안을 쓴 근거를 1~4줄로 적습니다(어떤 용건, 어떤 이력을 반영했는지).
handoff: 결제·환불·불만·건강이나 가정 사정, 학부모가 직원 연락을 원함, 같은 안내에 세 번 넘게 답이 없음처럼 근무자가 문자 대신 직원이 직접 대응해야 하면 그 이유를 한 문장으로, 아니면 null.`;

const anonymize = (text: string, name: string) => (name ? text.split(name).join(NAME_SLOT) : text);

function reasonLine(r: Reason): string {
  const extra = r.coachNames ? `담당 코치 ${r.coachNames.join(', ')}` : r.lastDate ? `마지막 일정 ${formatKstMonthDay(r.lastDate)}` : r.isNew ? '신규 학생' : '';
  return `- ${reasonLabel(r.kind)}${extra ? ` (${extra})` : ''}`;
}

/** 에이전트에 보낼 사실. 대상 이름은 자리표시로 바꾼다 */
export function buildDraftContext(target: DraftTarget, contacts: ContactLog[], workItems: WorkItem[], now: Date): string {
  const lines = [`오늘: ${kstDate(now)}`];
  if (target.kind === 'student') {
    lines.push('대상: 학생', `잔여 수업 ${target.remainingHours}시간`, '용건:', ...target.reasons.map(reasonLine));
  } else {
    lines.push('대상: 코치', '용건:', `- ${reasonLabel('coach')}`, `코칭룸 예약이 없는 담당 학생: ${target.studentNames.join(', ')}`);
  }

  const recent = contacts.slice(0, MAX_CONTACTS);
  lines.push(recent.length ? '연락 이력(최신순):' : '연락 이력: 없음');
  for (const c of recent) {
    lines.push(`- ${formatKstDateTime(c.contactedAt)} ${c.staffName}${c.listKey ? ` [${reasonLabel(c.listKey)}]` : ''} ${c.note ?? ''}`.trimEnd());
  }
  for (const w of workItems.slice(0, MAX_WORK_ITEMS)) {
    lines.push(`- 운영 업무 ${formatKstDateTime(w.postedAt)} ${w.authorName} (${w.done ? '완료' : '진행 중'}): ${w.text.replace(/\s+/g, ' ').slice(0, 300)}`);
  }
  return anonymize(lines.join('\n'), target.name);
}

export const fillName = (text: string, name: string) => text.split(NAME_SLOT).join(name);

/** 초안·근거·직원 넘김 사유. 거절되거나 형식이 깨지면 오류 */
export async function generateMessageDraft(context: string, client: Pick<Anthropic, 'messages'> = new Anthropic()): Promise<MessageDraft> {
  const response = await client.messages.parse({
    model: DRAFT_MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: 'medium', format: zodOutputFormat(DraftSchema) },
    messages: [{ role: 'user', content: context }],
  });
  if (response.stop_reason === 'refusal') throw new Error('message draft refused');
  if (!response.parsed_output) throw new Error(`message draft unparsable (stop_reason: ${response.stop_reason})`);
  return response.parsed_output;
}
