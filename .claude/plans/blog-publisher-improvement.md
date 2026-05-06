# Spec: blog-publisher 에이전트 워크플로우 보완

## Overview
`blog-publisher.md` 에이전트의 각 단계에 구체적인 기준과 스킬 파일 섹션 연결을 추가한다.
현재 단계 이름만 있고 적용 기준이 없어, 에이전트가 스킬 파일을 로드해도 어떻게 활용할지 알 수 없다.

## Requirements

### REQ-001: 1차 검토(논리) 기준 명시
- **Description**: 스킬의 QA 체크 항목(합니다체, 도입 3파트, CTA 없음, RESOURCE-only 등)을 기준으로 확인한다고 명시
- **Verification**: (MANUAL)
- **Priority**: Must

### REQ-002: 2차 검토(SEO) 기준 명시
- **Description**: 목차-헤딩 1:1 일치, 키워드 자연 포함, 레퍼런스 URL 포함 여부를 확인한다고 명시
- **Verification**: (MANUAL)
- **Priority**: Must

### REQ-003: 고스트 변환 규칙 연결
- **Description**: 네이버→고스트 변환 시 스킬의 "고스트 블로그 전용 지침" 섹션을 적용하고, SEO 메타/Excerpt/저자 바이오를 반드시 출력한다고 명시
- **Verification**: (MANUAL)
- **Priority**: Must

### REQ-004: 랜딩 변환 규칙 연결
- **Description**: 네이버→랜딩 변환 시 스킬의 "랜딩 페이지 블로그 전용 지침" 섹션을 적용하고, Supabase 필드 매핑을 완료한다고 명시
- **Verification**: (MANUAL)
- **Priority**: Must

### REQ-005: 플랫폼별 QA 체크리스트 통과 단계 추가
- **Description**: 각 플랫폼 파일 저장 전 해당 플랫폼 QA 체크리스트를 실행하는 단계를 워크플로우에 추가
- **Verification**: (MANUAL)
- **Priority**: Must

## Implementation Steps

**Step 1**: `blog-publisher.md` 워크플로우 섹션 재작성
- 각 단계에 구체적인 기준과 스킬 섹션 참조 추가
- 플랫폼별 QA 단계 추가
- File: `.claude/agents/blog-publisher.md`
- Complexity: Low
