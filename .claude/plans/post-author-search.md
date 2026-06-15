# Post Author Search

## Overview

Admin posts 목록에서 작성자(author) 기준으로 검색할 수 있게 한다.
현재 검색은 title/category만 대상이며, author 필드는 API 응답에 포함되어 있으나 Post 인터페이스와 필터 로직에 반영되지 않은 상태다.

## Requirements

### REQ-001: Post 인터페이스에 author 필드 추가
- **Priority**: Must
- **Description**: `Post` 인터페이스에 `author?: string` 추가 및 `fetchPosts`에서 매핑
- **Acceptance Criteria**: posts 상태에 author 값이 포함됨
- **Verification**: (MANUAL) 콘솔에서 posts 확인 시 author 필드 존재

### REQ-002: 검색 필터에 author 포함
- **Priority**: Must
- **Description**: `filteredPosts`의 filter 조건에 `post.author` 포함
- **Acceptance Criteria**: searchTerm이 author 이름과 일치하면 해당 포스트가 결과에 표시됨
- **Verification**: (BROWSER) "SuperfastSAT" 검색 시 해당 작성자 포스트만 표시

### REQ-003: 실제 author 이름 표시
- **Priority**: Must
- **Description**: 현재 하드코딩된 "By Admin" 대신 실제 author 값 표시
- **Acceptance Criteria**: 각 포스트 행에 실제 author 이름이 표시됨
- **Verification**: (BROWSER) 포스트 목록에서 작성자 이름 확인

## Technical Design

### Architecture
변경 범위: `src/app/admin/page.tsx` 단일 파일

1. `Post` 인터페이스: `author?: string` 추가
2. `fetchPosts`: API 응답의 `author` 필드를 상태에 매핑 (이미 API가 반환 중)
3. `filteredPosts`: `post.author?.toLowerCase().includes(...)` 조건 추가
4. 표시: `By Admin` → `By {post.author || 'SuperfastSAT'}`

### Dependencies
없음 — 기존 API가 이미 author를 반환함

## Traceability Matrix

| REQ ID  | Description           | Verification | Status  |
|---------|-----------------------|--------------|---------|
| REQ-001 | author 인터페이스 추가 | (MANUAL)     | Pending |
| REQ-002 | 검색 필터 확장         | (BROWSER)    | Pending |
| REQ-003 | author 표시 수정       | (BROWSER)    | Pending |

## Implementation Order

1. REQ-001 — 인터페이스 및 매핑 선행
2. REQ-002 — REQ-001 완료 후 필터 추가
3. REQ-003 — 표시 로직 수정

## Out of Scope

- 공개 블로그 페이지 author 필터
- author별 별도 탭 UI
