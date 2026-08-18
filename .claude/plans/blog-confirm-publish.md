# Blog Confirm & Publish — 요약본 확인 후 발행

## Overview

블로그 작성 후 바로 발행하지 않고, 슬랙 스레드에 요약본을 올려 사용자 컨펌 후 발행한다.
직접 주제 입력도 지원한다.

전체 흐름:
```
[07:00 KST] 주제 5개 → Slack
     ↓
사용자: "@landingpage 3번 써줘" 또는 "@landingpage 'SAT 단어 암기법' 써줘"
     ↓
Claude API로 블로그 작성
     ↓
Ghost draft + 랜딩 draft 저장
     ↓
슬랙 스레드에 요약본 + "[blog-agent: ghost_id=X|landing_id=Y]" 메타데이터 게시
     ↓
사용자: "@landingpage 발행할게요"
     ↓
Ghost published + 랜딩 is_published=true
     ↓
슬랙 스레드에 발행 완료 + 라이브 링크
```

---

## Requirements

### REQ-001: 요약본 슬랙 게시 (발행 전)
- **Priority**: Must
- **Description**: 블로그 작성 완료 후 바로 발행하지 않고 슬랙 스레드에 요약본 게시.
  메시지에 숨겨진 메타데이터 `[blog-agent: ghost_id=X|landing_id=Y|title=T]` 포함.
  사용자가 내용 확인 후 "@landingpage 발행할게요" 입력 안내.
- **Acceptance Criteria**: 스레드에 제목/요약/안내 메시지 게시, Ghost·랜딩 모두 draft 상태
- **Verification**: (MANUAL) 슬랙 스레드 확인, Ghost/Supabase draft 상태 확인

### REQ-002: 컨펌 감지 및 발행
- **Priority**: Must
- **Description**: "@landingpage 발행할게요" 감지 시 thread 메시지에서 메타데이터 파싱.
  Ghost post → status: published, 랜딩 post → is_published: true 업데이트.
  발행 완료 후 라이브 링크를 스레드에 게시.
- **Acceptance Criteria**: 컨펌 후 Ghost/랜딩 모두 published 상태, 슬랙에 라이브 링크
- **Verification**: (MANUAL) 실제 URL 접속 확인

### REQ-003: 직접 주제 입력
- **Priority**: Must
- **Description**: "@landingpage 'SAT 단어 암기법' 써줘" 패턴 감지.
  작은따옴표 또는 큰따옴표 내 텍스트를 주제로 사용.
- **Acceptance Criteria**: "@landingpage '주제명' 써줘" 입력 시 해당 주제로 블로그 작성
- **Verification**: (MANUAL) 직접 주제 입력 후 결과 확인

---

## Technical Design

### 메타데이터 저장 방식
추가 DB 테이블 없이 슬랙 메시지 자체에 메타데이터 인코딩:
```
[blog-agent: ghost_id=abc123|landing_id=def456|title=제목]
```
컨펌 시 thread 메시지에서 이 패턴을 파싱해 IDs 추출.

### Ghost 발행 업데이트
```
PUT /ghost/api/admin/posts/{id}/
body: { posts: [{ status: 'published', updated_at: ... }] }
```

### 랜딩 발행 업데이트
```
PATCH /rest/v1/posts?id=eq.{landing_id}
body: { is_published: true }
```

---

## Traceability Matrix

| REQ ID  | Description           | Verification | Status  |
|---------|-----------------------|--------------|---------|
| REQ-001 | 요약본 슬랙 게시       | (MANUAL)     | Pending |
| REQ-002 | 컨펌 감지 및 발행      | (MANUAL)     | Pending |
| REQ-003 | 직접 주제 입력         | (MANUAL)     | Pending |

## Implementation Order
1. REQ-001 — 요약본 게시 (발행 로직 분리)
2. REQ-002 — 컨펌 감지 + Ghost/랜딩 publish API
3. REQ-003 — 직접 주제 입력 패턴 추가
