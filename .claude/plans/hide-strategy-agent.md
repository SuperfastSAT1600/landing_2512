# Spec: 전략 에이전트 UI 숨김

## 배경
전략 에이전트(StrategyAgentChat)를 더 이상 사용하지 않기로 함. UI에서 접근 불가하게 숨긴다.
컴포넌트·API·타입은 보존(되돌리기 쉽게) — 삭제가 아니라 숨김.

## 진입점 (조사 결과 2곳뿐)
1. `StrategiesTab.tsx` 세일즈 전략 서브탭의 `전략 에이전트`(key=strategy_ai) 탭 버튼
2. `CrmInsightBanner.tsx` "이어서 전략 짜기" CTA → `onOpenStrategy` → 유일하게 strategy_ai로 진입

두 곳만 막으면 `subTab='strategy_ai'`가 될 경로가 없어 render(237)도 절대 발화 안 함.

## 요구사항
- REQ-1 (BROWSER): 세일즈 전략 탭 바에 `전략 에이전트` 탭이 보이지 않는다.
- REQ-2 (BROWSER): 인사이트 배너에 "이어서 전략 짜기" CTA가 보이지 않는다.
- REQ-3 (MANUAL): 되돌리기 용이 — 각 파일 모듈 플래그 `STRATEGY_AGENT_ENABLED`를 true로 바꾸면 원복. 컴포넌트/effect/import/onOpenStrategy 등 로직·코드는 유지(unused 에러 없이).
- REQ-4 (MANUAL): 다른 서브탭(채널 퍼널/실험/세일즈 로직 통계/전략 라이브러리)은 그대로 동작.
- REQ-5 (BROWSER): 선제 진단 인사이트 배너(CrmInsightBanner, "우리가 지금 해야 할 부분은 여기야")도 사용 중단으로 숨긴다. B2cWorkspace 세일즈 전략 메뉴에서 배너가 보이지 않는다. 플래그 `INSIGHT_BANNER_ENABLED`로 게이트(코드·API 보존, true로 복구). openStrategyAgent 등 참조 유지로 unused 없음.

## 검증
- Playwright: 세일즈 전략 화면 스크린샷 → 탭 5→4개, CTA 없음 확인.
- typecheck/lint clean (게이트로 참조 유지해 unused 없음).
