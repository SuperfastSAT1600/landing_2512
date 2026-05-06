# Blog Gated Content — Instagram 팔로우 잠금

## Overview

특정 블로그 포스팅에 6자리 코드를 설정하면, 방문자가 코드를 입력해야 본문 전체를 볼 수 있다.
코드는 인스타그램 팔로우 + 댓글 후 DM으로 받는 구조. 게이트 UI에서 이 과정을 자연스럽게 안내한다.

UX 방향: 상단 1-2문단 공개 → 본문 blur → 언락 패널 (인스타 안내 + 코드 입력)

---

## Requirements

### REQ-001: DB 마이그레이션
- **Priority**: Must
- **Description**: `posts` 테이블에 `access_code VARCHAR(6) NULL` 추가. NULL이면 공개, 값이 있으면 잠금.
- **File**: `supabase/migrations/011_add_access_code_to_posts.sql`
- **Verification**: (MANUAL)

### REQ-002: posts.ts — isGated 반환, content 미포함
- **Priority**: Must
- **Description**: `access_code`가 있는 포스팅은 `isGated: true`로 반환하고 `content`를 제거. 코드 값 자체는 클라이언트에 절대 노출하지 않음.
- **Verification**: (TEST)

### REQ-003: 코드 검증 API
- **Priority**: Must
- **Description**: `POST /api/posts/[slug]/verify-code` — `{ code }` 받아서 일치 시 `{ content }` 반환
- 불일치: 401 `{ error: "코드가 올바르지 않습니다." }`
- 포스팅 없음 / 잠금 없음: 404
- **Verification**: (TEST)

### REQ-004: GateWall 컴포넌트 — blur + 언락 패널
- **Priority**: Must
- **Description**: `isGated` 포스팅 진입 시 본문 대신 GateWall 표시
- **UI 구성**:
  - 제목 / 카테고리 / 날짜 표시 (excerpt 숨김)
  - 본문 첫 200자 미리보기 (HTML 태그 제거 후 순수 텍스트)
  - 미리보기 하단: fade-out gradient + blur overlay
  - 언락 패널:
    ```
    🔒 SuperfastSAT 인스타그램 팔로워 전용 콘텐츠

    STEP 1  @superfastsat_official 팔로우
    STEP 2  최신 게시물에 댓글 "코드 주세요" 달기
    STEP 3  DM으로 받은 6자리 코드 입력

    [ 인스타그램 바로가기 ↗ ]

    [ _ ][ _ ][ _ ][ _ ][ _ ][ _ ]
    틀린 경우 에러 메시지 표시

    [ 잠금 해제 ]
    ```
  - 6자리 입력 완료 시 자동 submit
  - 성공: sessionStorage에 코드 저장 → 본문 렌더링
  - 재방문 시 sessionStorage 확인 → 자동 언락
- **Verification**: (BROWSER)

### REQ-005: 어드민 에디터 — access_code 필드
- **Priority**: Must
- **Description**: 에디터에 "접근 코드 (6자리, 비우면 공개)" 입력 필드 추가
- 저장 시 `access_code` 포함 전송
- 기존 코드가 있으면 `••••••` 마스킹, 수정 가능
- **Verification**: (BROWSER)

### REQ-006: 어드민 API — access_code 저장
- **Priority**: Must
- **Description**: `POST /api/admin/posts`에서 `access_code` 필드 받아서 저장
- **Verification**: (TEST)

### REQ-007: 블로그 목록 🔒 배지
- **Priority**: Should
- **Description**: 목록에서 `isGated` 포스팅에 자물쇠 배지 표시
- **Verification**: (BROWSER)

---

## 수정 파일
| 파일 | 작업 |
|------|------|
| `supabase/migrations/011_add_access_code_to_posts.sql` | 신규 |
| `src/lib/posts.ts` | isGated 반환, content 제거 |
| `src/app/api/posts/[slug]/verify-code/route.ts` | 신규 |
| `src/app/blog/[slug]/page.tsx` | GateWall 조건부 렌더링 |
| `src/app/blog/[slug]/GateWall.tsx` | 신규 |
| `src/app/blog/BlogList.tsx` | 🔒 배지 |
| `src/app/admin/editor/page.tsx` | access_code 필드 |
| `src/app/api/admin/posts/route.ts` | access_code 저장 |
