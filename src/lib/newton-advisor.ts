// 뉴튼아카데미 데모 — 누적된 상담 노트를 '이번 주/이번 달/이번 분기 할 일'로 바꾸는 계층.
//
// 해결하려는 문제(대표님 원문): 10년차 베테랑은 상담 메모만 보고도 다음에 무슨 일을 할지 안다.
// 신규·저경력 담당자는 기록이 쌓여도 이번 주에 무엇부터 해야 할지 모른다. 그 격차를 AI가 메운다.
//
// 설계 원칙:
//  - 산출물은 '분석'이 아니라 신규 담당자가 그대로 실행할 수 있는 업무 목록이다.
//  - 각 업무에는 why(베테랑의 판단 근거)가 붙는다. 일만 주면 학습이 안 되기 때문이다.
//  - 모든 주장은 근거 노트 id를 달고 나온다(noteIds). 근거 없는 문장은 파싱 단계에서 버린다.
//  - 각 업무는 뉴튼 공식 가치(NEWTON 6개) 중 하나에 매핑된다. 학교의 언어로 말하기 위함.
//  - LLM 호출부는 CRM의 insight-brief 라우트와 동일한 계약(JSON only + 실패 시 폴백)을 따른다.

import type { ConsultationEntry } from '@/types/crm';

export const NEWTON_VALUES = [
  'Nurture Excellence',
  'Empower Minds',
  'Wisdom through Discovery',
  'Thrive in Innovation',
  'Opportunities for Growth',
  'Noble Character',
] as const;

export type NewtonValue = (typeof NEWTON_VALUES)[number];

export interface AdvisorSignal {
  title: string;
  detail: string;
  severity: 'critical' | 'watch';
  noteIds: string[];
}

/**
 * 신규 담당자가 그대로 실행할 수 있는 한 건의 업무.
 * `why`는 베테랑은 알고 신입은 모르는 판단 근거 — 이 데모의 핵심 값이다.
 */
export interface AdvisorTask {
  task: string;
  owner: string;
  due: string;
  why: string;
  value: NewtonValue;
  noteIds: string[];
}

export interface AdvisorRisk {
  title: string;
  detail: string;
  firstMove: string;
  noteIds: string[];
}

export interface AdvisorPlan {
  summary: string;
  signals: AdvisorSignal[];
  /** 앞으로 7일 안에 해야 할 일 */
  thisWeek: AdvisorTask[];
  /** 이번 달이 끝나기 전에 해야 할 일 */
  thisMonth: AdvisorTask[];
  /** 한 학기 뒤에 효과를 보려면 지금 세팅해야 할 일 */
  thisQuarter: AdvisorTask[];
  risks: AdvisorRisk[];
}

/** 학생 패널 좌측에 상시 떠 있는 짧은 현황 브리핑 (플랜과 달리 '지금 상태' 요약). */
export interface AdvisorBrief {
  headline: string;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  recommendation: string;
}

export const BRIEF_SYSTEM = `You are the academic advising analyst for Newton Academy, an international school in Seoul.
Given every advising note recorded for one student, write the short status card that sits on the advisor's screen.
It answers "where does this student stand right now?" — not "what should we do about it".

This card is small. Brevity is a hard requirement.

Length limits:
- headline: ONE sentence, 20 words max.
- strengths / weaknesses / risks: at most 3 bullets each. Each bullet ONE short phrase or sentence, 14 words max.
- recommendation: ONE sentence, 18 words max.

Quality bar:
- Every bullet must carry a specific fact from the record — a score, a count, a date, elapsed days, or a quoted phrase. A bullet with no such anchor is filler; drop it.
- No bullet may restate another. If two say the same thing at different wording, keep the sharper one.
- The headline names the TENSION in this record — the thing that makes the case hard — not a neutral status line.
- The recommendation is the single highest-leverage next move, and it names what must exist afterwards.
- Plain language a teacher reads in one pass. No stacked clauses, no dashes joining two thoughts.
- Write in English. Do not mention note ids.

Return exactly one JSON object and nothing else. No prose, no code fences. Shape:
{"headline":"one line naming the student's current situation","strengths":["..."],"weaknesses":["..."],"risks":["..."],"recommendation":"one sentence"}`;

export function parseBrief(raw: string): AdvisorBrief | null {
  if (!raw?.trim()) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;

  const brief: AdvisorBrief = {
    headline: String(obj.headline ?? ''),
    strengths: asStringArray(obj.strengths),
    weaknesses: asStringArray(obj.weaknesses),
    risks: asStringArray(obj.risks),
    recommendation: String(obj.recommendation ?? ''),
  };
  const hasContent =
    brief.headline.length > 0 ||
    brief.strengths.length > 0 ||
    brief.weaknesses.length > 0 ||
    brief.risks.length > 0;
  return hasContent ? brief : null;
}

export const ADVISOR_SYSTEM = `You are the advising operations assistant for Newton Academy, an international school in Seoul.

Your reader is an advisor who joined recently. They have never met this student and cannot yet look at a wall of accumulated notes and infer what to do. A counsellor with ten years of experience reads the same record and immediately knows what has to happen this week, this month, and this quarter. Make that knowledge explicit so the new advisor acts with the same judgement on day one.

Produce a WORK LIST, not an analysis. It will be shown on a compact three-column board, so BREVITY IS A HARD REQUIREMENT.

Length limits — exceeding them makes the output unusable:
- summary: ONE sentence, 25 words max.
- signals: at most 3. title 8 words max. detail ONE sentence, 25 words max.
- thisWeek / thisMonth / thisQuarter: at most 3 tasks each.
- task: ONE imperative line, 14 words max. Start with a verb.
- why: ONE sentence, 20 words max.
- risks: at most 2. title 8 words max, detail ONE sentence 20 words max, firstMove ONE short line.

Rules:
- The task must be concrete and checkable: call X, book a 30-minute meeting with Y, send Z by Friday, get a written answer on W. A new advisor must be able to do it without deciding anything first. Banned: monitor, support, encourage, ensure, facilitate, explore, keep an eye on, be aware of.
- "why" is what the veteran knows and the new hire does not — what makes it urgent now, or what breaks if it slips. One sentence. No preamble.
- "noteIds" cites the notes it came from (2-4 ids is plenty). Never assert what you cannot point to. Do NOT write note ids inside prose.
- "owner" is a short name or role. "due" is short: "by Friday", "before 31 Aug", "week 1 of term".
- Each task carries exactly one Newton Academy value from: ${NEWTON_VALUES.join(' | ')}.
- Pick only the highest-leverage items. Leaving something out is better than a crowded board.
- Plain language a teacher or office staff member reads in one pass. No jargon, no clauses stacked with dashes.
- Write in English.

Return exactly one JSON object and nothing else. No prose, no code fences. Shape:
{
  "summary": "one sentence, 25 words max",
  "signals": [{"title":"8 words max","detail":"one sentence","severity":"critical"|"watch","noteIds":["note-08","note-15"]}],
  "thisWeek": [{"task":"one imperative line","owner":"Claire Jung","due":"by Friday","why":"one sentence","value":"Empower Minds","noteIds":["note-30"]}],
  "thisMonth": [{"task":"...","owner":"...","due":"before 31 Aug","why":"...","value":"...","noteIds":[...]}],
  "thisQuarter": [{"task":"...","owner":"...","due":"week 1 of term","why":"...","value":"...","noteIds":[...]}],
  "risks": [{"title":"...","detail":"...","firstMove":"...","noteIds":[...]}]
}`;

/**
 * 자기 비판 후 재작성 패스.
 *
 * 1차 생성물은 형식은 맞지만 '그럴듯한 일반론'이 섞인다. 같은 스키마·같은 길이 제한 아래에서
 * 실패 유형을 명시해 스스로 감사하고 고쳐 쓰게 한다 — 데모의 핵심 산출물이라 한 번 더 태운다.
 */
export const REVISE_SYSTEM = `You are auditing a work list that an assistant produced from one student's advising record. You have the same record. Your job is to make it materially better, not to compliment it.

Audit every item against these failure modes and fix what fails:
1. VAGUE COMPLETION — the task does not name an artifact or decision that proves it is done. Rewrite so it does.
2. UNQUANTIFIED SIGNAL — a signal states an impression with no count, rate, average, delta, or dated before/after. Add the number from the record, or cut the signal.
3. SINGLE-NOTE SIGNAL — the "pattern" is visible in one note, so it is not a cross-record insight. Replace it with one that only appears when the record is lined up.
4. GENERIC JUDGEMENT — the "why" would read the same for any student. Replace it with the specific number or consequence from THIS record.
5. DUPLICATE — two items say the same thing, or a task repeats a signal. Merge or cut.
6. WRONG BUCKET — an item placed in thisMonth/thisQuarter that must actually happen before something in thisWeek, or vice versa. Move it and state the dependency in "why".
7. MISSING BLIND SPOT — the record has a position known only second-hand or a cause never verified, and no signal names it. Add it.
8. LENGTH — anything over the limits below. Cut words, never meaning.

Hard limits (unchanged): summary 1 sentence 25 words; at most 3 signals, title 8 words, detail 1 sentence 25 words; at most 3 tasks per bucket, task 1 line 14 words starting with a verb, why 1 sentence 20 words; at most 2 risks.
Keep the exact same JSON shape and field names. Keep noteIds accurate — never cite a note id that is not in the record.
Write in English.

Return exactly one JSON object and nothing else. No prose, no code fences, no commentary about what you changed.`;

/** 노트 배열을 LLM 입력용 텍스트로 편다. id를 앞에 붙여 근거 인용이 가능하게 한다. */
export function formatNotes(notes: ConsultationEntry[]): string {
  return notes
    .map(n => `[${n.id}] ${n.created_at.slice(0, 10)} — ${n.author ?? 'Unknown'}\n${n.raw_memo}`)
    .join('\n\n');
}

export function buildAdvisorUserPrompt(notes: ConsultationEntry[], extraNote?: string): string {
  const base = `Advising record (${notes.length} notes):\n\n${formatNotes(notes)}`;
  if (!extraNote?.trim()) {
    return `${base}\n\nProduce the plan as JSON.`;
  }
  return `${base}\n\nA new note was just added by the advisor:\n"""\n${extraNote.trim()}\n"""\nTreat it as note id "note-new" dated today. Re-read the whole record with it included and produce the updated plan as JSON. If it changes your reading, say so in the summary.`;
}

// ── 파싱 ──────────────────────────────────────────────────────────────────────

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function asValue(v: unknown): NewtonValue {
  return NEWTON_VALUES.includes(v as NewtonValue) ? (v as NewtonValue) : 'Nurture Excellence';
}

function parseTasks(v: unknown): AdvisorTask[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
    .map(a => ({
      // 구 스키마(action/rationale)도 받아준다 — 프롬프트 변경 전 응답이 섞여도 화면이 비지 않게.
      task: String(a.task ?? a.action ?? ''),
      owner: String(a.owner ?? ''),
      due: String(a.due ?? ''),
      why: String(a.why ?? a.rationale ?? ''),
      value: asValue(a.value),
      noteIds: asStringArray(a.noteIds),
    }))
    .filter(a => a.task.length > 0);
}

/**
 * LLM 응답 텍스트에서 플랜을 뽑는다. 코드펜스/앞뒤 잡텍스트를 견딘다.
 * 형태가 깨졌거나 실질 내용이 없으면 null — 호출부가 폴백을 쓰게 한다.
 */
export function parsePlan(raw: string): AdvisorPlan | null {
  if (!raw?.trim()) return null;

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;

  const signals: AdvisorSignal[] = Array.isArray(obj.signals)
    ? obj.signals
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
        .map((s): AdvisorSignal => ({
          title: String(s.title ?? ''),
          detail: String(s.detail ?? ''),
          severity: s.severity === 'critical' ? 'critical' : 'watch',
          noteIds: asStringArray(s.noteIds),
        }))
        .filter(s => s.title.length > 0)
    : [];

  const risks: AdvisorRisk[] = Array.isArray(obj.risks)
    ? obj.risks
        .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
        .map(r => ({
          title: String(r.title ?? ''),
          detail: String(r.detail ?? ''),
          firstMove: String(r.firstMove ?? ''),
          noteIds: asStringArray(r.noteIds),
        }))
        .filter(r => r.title.length > 0)
    : [];

  const plan: AdvisorPlan = {
    summary: String(obj.summary ?? ''),
    signals,
    thisWeek: parseTasks(obj.thisWeek),
    thisMonth: parseTasks(obj.thisMonth),
    thisQuarter: parseTasks(obj.thisQuarter),
    risks,
  };

  const hasContent =
    plan.signals.length > 0 ||
    plan.thisWeek.length > 0 ||
    plan.thisMonth.length > 0 ||
    plan.thisQuarter.length > 0;

  return hasContent ? plan : null;
}

/** 플랜이 인용한 모든 노트 id를 모은다. 픽스처 정합성 검증과 링크 렌더에 쓴다. */
export function citedNoteIds(plan: AdvisorPlan): string[] {
  const ids = [
    ...plan.signals.flatMap(s => s.noteIds),
    ...plan.thisWeek.flatMap(a => a.noteIds),
    ...plan.thisMonth.flatMap(a => a.noteIds),
    ...plan.thisQuarter.flatMap(a => a.noteIds),
    ...plan.risks.flatMap(r => r.noteIds),
  ];
  return [...new Set(ids)];
}
