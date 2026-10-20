import { z } from 'zod';

// 코치 준비 응답 요청 — 검증과 순수 헬퍼. 입력·표시 시간은 모두 KST 기준이다.

const KST_OFFSET_MS = 9 * 60 * 60_000;
const isoDateTime = z.iso.datetime({ offset: true });
const isFuture = (iso: string) => Date.parse(iso) > Date.now();

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
    reason: z.string().max(500, '사유는 500자 이하로 입력해 주세요.').optional(),
  })
  .superRefine((v, ctx) => {
    if (v.action === 'accept') {
      if (!v.first_lesson_at) {
        ctx.addIssue({ code: 'custom', path: ['first_lesson_at'], message: '첫 수업 일시를 입력해 주세요.' });
      } else if (!isFuture(v.first_lesson_at)) {
        ctx.addIssue({ code: 'custom', path: ['first_lesson_at'], message: '첫 수업 일시는 현재보다 이후여야 합니다.' });
      }
    } else if (v.first_lesson_at) {
      ctx.addIssue({ code: 'custom', path: ['first_lesson_at'], message: '수업이 어려운 경우 첫 수업 일시를 보낼 수 없습니다.' });
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

const pad = (n: number) => String(n).padStart(2, '0');

function kstParts(date: Date) {
  const k = new Date(date.getTime() + KST_OFFSET_MS);
  return { y: k.getUTCFullYear(), mo: pad(k.getUTCMonth() + 1), d: pad(k.getUTCDate()), h: pad(k.getUTCHours()), mi: pad(k.getUTCMinutes()) };
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

/** "10/21 09:00" (KST) */
export function formatKst(iso: string): string {
  const p = kstParts(new Date(iso));
  return `${p.mo}/${p.d} ${p.h}:${p.mi}`;
}

/** 저장된 응답과 같은 내용인지(첫 수업 일시는 표기가 달라도 같은 시각이면 같다). */
export function isSameResponse(
  saved: { status: string; first_lesson_at: string | null; decline_reason: string | null },
  status: string,
  firstLessonAt: string | null,
  declineReason: string | null,
): boolean {
  const sameTime = saved.first_lesson_at === null || firstLessonAt === null
    ? saved.first_lesson_at === firstLessonAt
    : Date.parse(saved.first_lesson_at) === Date.parse(firstLessonAt);
  return saved.status === status && sameTime && (saved.decline_reason ?? null) === declineReason;
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
  return [`학생 자료를 확인하시고 ${formatKst(deadlineAt)}(KST)까지 수업 가능 여부와 첫 수업 일정을 남겨 주세요.`, '', ...lines].join('\n');
}
