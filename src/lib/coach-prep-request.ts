import { z } from 'zod';
import type { LessonTimes } from '@/types/coach-prep';

// 코치 준비 응답 요청 — 검증과 순수 헬퍼. 입력·표시 시간은 모두 KST 기준이다.

const KST_OFFSET_MS = 9 * 60 * 60_000;
const isoDateTime = z.iso.datetime({ offset: true });
const isFuture = (iso: string) => Date.parse(iso) > Date.now();
const sameInstant = (a: string | null | undefined, b: string | null | undefined) =>
  a == null || b == null ? a == b : Date.parse(a) === Date.parse(b);
const isOrderWrong = (first: string | null | undefined, second: string | null | undefined) =>
  !!first && !!second && Date.parse(second) <= Date.parse(first);

export const MAX_COACHES_PER_REQUEST = 5;

export const CreateRequestsSchema = z.object({
  coach_slugs: z
    .array(z.string().min(1))
    .min(1, '코치를 1명 이상 선택해 주세요.')
    .max(MAX_COACHES_PER_REQUEST, `코치는 최대 ${MAX_COACHES_PER_REQUEST}명까지 선택할 수 있습니다.`)
    .refine((slugs) => new Set(slugs).size === slugs.length, '같은 코치를 중복 선택할 수 없습니다.'),
  deadline_at: isoDateTime.refine(isFuture, '마감 일시는 현재보다 이후여야 합니다.'),
});

export const RespondSchema = z
  .object({
    token: z.string().min(16),
    action: z.enum(['accept', 'decline']),
    first_lesson_at: isoDateTime.optional(),
    second_lesson_at: isoDateTime.optional(),
    option2_first_lesson_at: isoDateTime.optional(),
    option2_second_lesson_at: isoDateTime.optional(),
    reason: z.string().max(500, '사유는 500자 이하로 입력해 주세요.').optional(),
  })
  .superRefine((v, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    const times = [v.first_lesson_at, v.second_lesson_at, v.option2_first_lesson_at, v.option2_second_lesson_at];
    if (v.action === 'decline') {
      if (times.some(Boolean)) fail('first_lesson_at', '수업이 어려운 경우 수업 일시를 보낼 수 없습니다.');
      return;
    }
    if (!v.first_lesson_at) fail('first_lesson_at', '옵션 1의 첫 수업 일시를 입력해 주세요.');
    if (!v.second_lesson_at) fail('second_lesson_at', '옵션 1의 두 번째 수업 일시를 입력해 주세요.');
    if (!!v.option2_first_lesson_at !== !!v.option2_second_lesson_at) {
      fail('option2_first_lesson_at', '옵션 2는 첫 수업과 두 번째 수업을 모두 입력하거나 모두 비워 주세요.');
    }
    if (times.some((t) => t && !isFuture(t))) fail('first_lesson_at', '수업 일시는 현재보다 이후여야 합니다.');
    if (isOrderWrong(v.first_lesson_at, v.second_lesson_at)) fail('second_lesson_at', '옵션 1의 두 번째 수업은 첫 수업보다 늦어야 합니다.');
    if (isOrderWrong(v.option2_first_lesson_at, v.option2_second_lesson_at)) fail('option2_second_lesson_at', '옵션 2의 두 번째 수업은 첫 수업보다 늦어야 합니다.');
    if (v.option2_first_lesson_at && sameInstant(v.first_lesson_at, v.option2_first_lesson_at) && sameInstant(v.second_lesson_at, v.option2_second_lesson_at)) {
      fail('option2_first_lesson_at', '옵션 1과 옵션 2가 같은 일정입니다.');
    }
  });

// 24바이트 랜덤 -> base64url 32자. Web Crypto만 써서 클라이언트 번들에도 안전하다.
export function generateRequestToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isClosed(deadlineAt: string, now: Date = new Date()): boolean {
  return now.getTime() > Date.parse(deadlineAt);
}

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');

function kstParts(date: Date) {
  const k = new Date(date.getTime() + KST_OFFSET_MS);
  return { y: k.getUTCFullYear(), mo: pad(k.getUTCMonth() + 1), d: pad(k.getUTCDate()), wd: WEEKDAYS_KO[k.getUTCDay()], h: pad(k.getUTCHours()), mi: pad(k.getUTCMinutes()) };
}

/** `<input type="datetime-local">` 값(KST) -> `+09:00` ISO. 형식이 틀리면 null. */
export function kstInputToIso(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00+09:00` : null;
}

/** ISO -> `datetime-local` 값(KST). */
export function isoToKstInput(iso: string): string {
  const p = kstParts(new Date(iso));
  return `${p.y}-${p.mo}-${p.d}T${p.h}:${p.mi}`;
}

/** 기본 응답 마감: 지금부터 24시간 뒤. */
export function defaultDeadlineInput(now: Date = new Date()): string {
  return isoToKstInput(new Date(now.getTime() + 24 * 60 * 60_000).toISOString());
}

/** "10/21(수) 09:00" (KST) — 요일을 함께 보여 날짜를 잘못 읽는 일을 줄인다 */
export function formatKst(iso: string): string {
  const p = kstParts(new Date(iso));
  return `${p.mo}/${p.d}(${p.wd}) ${p.h}:${p.mi}`;
}

/** `datetime-local` 값(KST) -> "10/26(월)". 형식이 틀리면 빈 문자열. */
export function kstInputDayLabel(value: string): string {
  const iso = kstInputToIso(value);
  if (!iso || Number.isNaN(Date.parse(iso))) return '';
  const p = kstParts(new Date(iso));
  return `${p.mo}/${p.d}(${p.wd})`;
}

export interface LessonOption { label: string; first: string; second: string }

/** 옵션 1(필수)·옵션 2(선택)를 값이 있는 것만 순서대로 돌려준다. */
export function lessonOptions(t: LessonTimes): LessonOption[] {
  const out: LessonOption[] = [];
  if (t.first_lesson_at && t.second_lesson_at) out.push({ label: '옵션 1', first: t.first_lesson_at, second: t.second_lesson_at });
  if (t.option2_first_lesson_at && t.option2_second_lesson_at) out.push({ label: '옵션 2', first: t.option2_first_lesson_at, second: t.option2_second_lesson_at });
  return out;
}

export const EMPTY_LESSON_TIMES: LessonTimes = {
  first_lesson_at: null, second_lesson_at: null, option2_first_lesson_at: null, option2_second_lesson_at: null,
};

/** 저장된 응답과 같은 내용인지(수업 일시는 표기가 달라도 같은 시각이면 같다). */
export function isSameResponse(
  saved: LessonTimes & { status: string; decline_reason: string | null },
  status: string,
  times: LessonTimes,
  declineReason: string | null,
): boolean {
  const keys = Object.keys(EMPTY_LESSON_TIMES) as (keyof LessonTimes)[];
  return saved.status === status && keys.every((k) => sameInstant(saved[k], times[k])) && (saved.decline_reason ?? null) === declineReason;
}

/** 링크 생성부터 마감까지 중 지난 비율(0~1) */
export function deadlineProgress(createdAt: string, deadlineAt: string, nowMs: number): number {
  const start = Date.parse(createdAt);
  const end = Date.parse(deadlineAt);
  if (end <= start) return nowMs >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (nowMs - start) / (end - start)));
}

/** 마감까지 남은 시간 표기 (밀리초 입력). */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return '마감';
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 1) return '1분 미만';
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${mins}분`;
  return `${mins}분`;
}

export function buildLinkMessage(
  origin: string,
  studentId: string,
  items: { coachName: string; token: string }[],
  deadlineAt: string,
): string {
  const lines = items.map((i) => `${i.coachName}: ${origin}/coach-prep/${studentId}?t=${i.token}`);
  return [`학생 자료를 확인하시고 ${formatKst(deadlineAt)}(KST)까지 수업 가능 여부와 희망하시는 첫 수업·두 번째 수업 일정(옵션 1, 2)을 남겨 주세요.`, '', ...lines].join('\n');
}
