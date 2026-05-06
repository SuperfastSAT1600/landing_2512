# Blog Critic System — Writer + Critic 두 에이전트 파이프라인

## Overview

SuperfastSAT 블로그 포스팅의 구조적 실패를 산문 생성 전에 차단하는 시스템.

현재 문제: Writer(SKILL.md)가 산문을 생성한 후 구조 문제를 발견하면 재작성 비용이 발생한다.
(예: 오늘 포스팅의 섹션 1 — 오프닝을 반복해서 따로 노는 문제)

해결 방향: 5개의 Failure Mode(FM) 카탈로그를 Writer와 Critic이 공유한다.
- Writer: 골격(Skeleton) 단계에서 FM 자가진단 → 산문 생성 전 차단
- Critic: 독립 에이전트로 FM 판정 → Pass 없이 발행 불가

## 5개 Failure Mode 카탈로그

| FM | 이름 | 실패 조건 |
|----|------|----------|
| FM-1 | Opening Debt | 오프닝 약속을 본문이 이행하지 않음 |
| FM-2 | Momentum Drain | 섹션이 오프닝 주장을 반복(repeat) 또는 역행(regress) |
| FM-3 | Mechanism Vacuum | "왜(WHY)" 인과 설명이 글에 없음 |
| FM-4 | Escape Route | 독자가 기존 믿음을 포기하지 않아도 글을 수용 가능 |
| FM-5 | Reader Delta Void | 독자가 읽기 전/후 판단·행동이 달라지지 않음 |

## Requirements

### REQ-001: Skeleton Gate (Writer Skill에 추가)
- **Priority**: Must
- **Description**: 산문 작성 전 골격 양식 작성 + FM 1~5 자가진단을 SKILL.md에 추가
- **Acceptance Criteria**: SKILL.md에 Skeleton Gate 섹션이 존재하고, FM Fail 시 산문 진행 차단 지시가 명확함
- **Verification**: (MANUAL) SKILL.md 읽고 Skeleton Gate가 산문 생성 전 위치에 있는지 확인

### REQ-002: Blog Critic 에이전트 생성
- **Priority**: Must
- **Description**: `.claude/agents/blog-critic.md` 파일 생성 — FM 1~5 판정 루브릭을 가진 독립 Critic 에이전트
- **Acceptance Criteria**: 에이전트 파일이 존재하고, 입력(골격) → 출력(FM별 Pass/Fail + Fail 이유) 형식이 명확함
- **Verification**: (MANUAL) 오늘 포스팅 골격을 입력했을 때 FM-1/FM-2 Fail이 올바르게 감지되는지 확인

### REQ-003: 두 파일이 동일한 FM 카탈로그 공유
- **Priority**: Must
- **Description**: SKILL.md의 자가진단 기준과 blog-critic.md의 판정 기준이 동일한 FM 정의를 사용
- **Acceptance Criteria**: FM 번호, 이름, 감지 방법이 두 파일에서 일치
- **Verification**: (MANUAL) 두 파일 나란히 읽고 FM 정의 불일치 없음 확인

## Traceability Matrix

| REQ ID  | Description | Verification | 파일 | Status |
|---------|-------------|--------------|------|--------|
| REQ-001 | Skeleton Gate in SKILL.md | (MANUAL) | `.claude/skills/superfastsat-blog/SKILL.md` | Pending |
| REQ-002 | blog-critic.md 생성 | (MANUAL) | `.claude/agents/blog-critic.md` | Pending |
| REQ-003 | FM 카탈로그 일치 | (MANUAL) | 두 파일 교차 확인 | Pending |

## Implementation Order

1. **REQ-002** — blog-critic.md 먼저 작성 (FM 정의의 기준 파일이 됨)
2. **REQ-001** — SKILL.md에 Skeleton Gate 추가 (blog-critic.md의 FM 정의를 그대로 따름)
3. **REQ-003** — 두 파일 교차 확인

## 파일별 구조 설계

### `.claude/agents/blog-critic.md`
```
입력: 골격 양식 (오프닝 주장 + 섹션별 전진 논리 + 메커니즘 위치 + 독자 델타)
처리: FM-1~5 각각 판정
출력:
  FM-1 Opening Debt: Pass / Fail — [이유]
  FM-2 Momentum Drain: Pass / Fail — [Repeat/Regress 섹션명]
  FM-3 Mechanism Vacuum: Pass / Fail — [이유]
  FM-4 Escape Route: Pass / Fail — [이유]
  FM-5 Reader Delta Void: Pass / Fail — [이유]
  
  종합: ALL PASS → 산문 생성 허가 / ANY FAIL → 골격 수정 후 재제출
```

### `SKILL.md` 추가 섹션 (STEP 0.5: Skeleton Gate)
```
산문 작성 전 필수:
1. 골격 양식 작성
2. FM 1~5 자가진단
3. ALL PASS → STEP 1(산문) 진행
   ANY FAIL → 골격 수정 후 재진단
```

## Out of Scope

- 자동화된 에이전트 실행 (blog-critic은 수동 호출 또는 SKILL에서 명시적 호출)
- 산문 품질 평가 (문체, SEO 수치 등) — FM은 구조적 실패만 다룸
- 기존 포스팅 소급 평가
