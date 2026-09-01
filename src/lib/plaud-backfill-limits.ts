/**
 * 백필 한 배치의 시간 배분.
 *
 * 세 값은 서로 묶여 있다. `outOfTime()`은 새 전사를 "시작"하는 것만 막고 진행 중인
 * 전사를 끊지 않으므로(끊으면 이미 쓴 ASR 비용이 버려진다), 한 배치의 최악 소요는
 * `BUDGET + MAX_POLLS * POLL_INTERVAL`이다. 이 합이 서버리스 실행 한도를 넘으면
 * 함수가 504로 죽고 그 배치에서 성공한 건들의 리포트까지 통째로 날아간다.
 *
 * 불변식은 `__tests__/plaud-backfill-limits.test.ts`가 지킨다.
 */

/** 라우트의 `export const maxDuration`과 같은 값(Next는 그 값을 정적으로 읽으므로 리터럴로 둔다). */
export const BACKFILL_MAX_DURATION_S = 300;

/** 새 전사를 시작할 수 있는 시간. 함수 진입(목록 조회 포함) 시점부터 잰다. */
export const BACKFILL_BUDGET_MS = 150_000;

/**
 * 백필 경로의 ASR 폴링 상한(40회 x 3s = 120s). 실측이 21분/20MB에 ~22초이므로
 * 5배 여유다. 대화형 메모 생성(`plaud-memo`)은 기본값 80회를 그대로 쓴다 —
 * 그쪽은 한 요청에 전사가 한 건뿐이라 240초를 써도 한도 안에 들어간다.
 */
export const BACKFILL_MAX_POLLS = 40;
