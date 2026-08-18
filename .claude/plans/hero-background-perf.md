---
spec: hero-background-perf
version: 1.0
status: approved
---

# Spec: Hero 섹션 애니메이션 성능 최적화

## Context

HeroBackground.tsx Canvas 파티클 스트림 애니메이션의 CPU/GC 병목 제거.
주 원인: 매 프레임 createLinearGradient(), rgba() 문자열, 삼각함수 중복 호출, shadowBlur 과다.

## Requirements

### REQ-001: Low/Medium tier Linear Gradient 제거 `(TEST)`
**Priority: Must**
Low/Medium 티어에서 `Stream.draw()`의 `createLinearGradient()` 호출을 제거하고 단색(`color`)으로 대체. High 티어는 기존 gradient 유지.

### REQ-002: 색상 계산 LUT 적용 `(TEST)`
**Priority: Must**
`getPaletteColor(t, alpha)` 를 모듈 레벨 100단계 LUT로 교체. `alpha` 파라미터 제거, `globalAlpha`로 투명도 처리.

### REQ-003: 삼각함수 사전 계산 `(TEST)`
**Priority: Must**
`Stream.reset()`에서 `cosAngle`, `sinAngle`을 1회만 계산. `draw()` 내 `getPos()`에서 재사용.

### REQ-004: Shadow Blur 조건 강화 `(TEST)`
**Priority: Should**
High tier shadow 조건 `isBright || p > 0.8` → `isBright && p > 0.7` (OR→AND), shadowBlur 15 → 8.

### REQ-005: 스트림 수 감소 `(BROWSER)`
**Priority: Should**
`{ low: 30, medium: 60, high: 120 }` → `{ low: 20, medium: 45, high: 80 }`.

### REQ-006: FPS 스로틀 검토 `(MANUAL)`
**Priority: Could**
Low/Medium 33ms 유지 (REQ-001~003 최적화 후 체감 개선 기대). 변경 없음.

## Traceability Matrix

| REQ ID  | 파일                        | 검증      |
|---------|-----------------------------|-----------|
| REQ-001 | HeroBackground.tsx:156-198  | (TEST)    |
| REQ-002 | HeroBackground.tsx:59-64    | (TEST)    |
| REQ-003 | HeroBackground.tsx:118-198  | (TEST)    |
| REQ-004 | HeroBackground.tsx:190-193  | (TEST)    |
| REQ-005 | HeroBackground.tsx:203      | (BROWSER) |
| REQ-006 | HeroBackground.tsx:214-221  | (MANUAL)  |
