# Instagram Reel 삽입 기능 (블로그 에디터)

## Overview

블로그 에디터에서 인스타그램 릴스를 삽입할 수 있는 기능을 추가한다.
현재 YouTube만 지원하는 영상 삽입 기능을 확장하여, 툴바 버튼 및 `/` 슬래시 메뉴에서
인스타그램 릴스 URL을 입력하면 에디터와 블로그 포스팅 화면 모두에서 iframe 임베드로 표시된다.

## Requirements

### REQ-001: TipTap 커스텀 Node 익스텐션 생성
- **Priority**: Must
- **Description**: `InstagramReelExtension` TipTap Node를 만들어 shortcode 속성을 받고, `renderHTML`은 iframe을 출력하고, `addNodeView`는 에디터 캔버스에 iframe을 표시한다. 기존 `buildReelEmbedUrl`을 재사용한다.
- **Acceptance Criteria**: 익스텐션이 에디터에 등록되고 `setInstagramReel` 커맨드를 제공한다.
- **Verification**: (TEST) `parseInstagramShortcode`로 URL → shortcode 변환이 올바른지 기존 유틸 단위 테스트로 확인

### REQ-002: URL 검증 및 삽입 핸들러
- **Priority**: Must
- **Description**: `BlogEditor.tsx`에 `insertReel` 함수를 추가한다. `window.prompt`로 URL 입력 → `parseInstagramShortcode`로 shortcode 추출 → 유효하지 않으면 alert → 유효하면 `setInstagramReel` 실행.
- **Acceptance Criteria**: 유효하지 않은 URL 입력 시 에러 alert, 유효한 URL 입력 시 에디터에 reel이 삽입된다.
- **Verification**: (MANUAL) 에디터에서 인스타그램 릴스 URL 입력 테스트

### REQ-003: 툴바 버튼 추가
- **Priority**: Must
- **Description**: `FormattingToolbar.tsx`에 Instagram 아이콘 버튼을 추가하고, `onInsertReel` prop을 통해 핸들러를 연결한다.
- **Acceptance Criteria**: 툴바에 Instagram 아이콘이 보이고, 클릭 시 URL 입력 프롬프트가 뜬다.
- **Verification**: (BROWSER) 에디터 툴바에서 Instagram 버튼 클릭 확인

### REQ-004: 슬래시 메뉴 옵션 추가
- **Priority**: Should
- **Description**: `useSlashMenu.ts`에 `'instagram'` 옵션을 추가해 `/instagram` 또는 `/reel` 입력 시 트리거된다.
- **Acceptance Criteria**: 빈 줄에서 `/` 입력 후 Instagram 옵션이 슬래시 메뉴에 표시된다.
- **Verification**: (BROWSER) 슬래시 메뉴에서 Instagram 옵션 선택 확인

### REQ-005: 블로그 포스팅 화면 렌더링
- **Priority**: Must
- **Description**: 저장된 HTML에 포함된 iframe이 블로그 포스팅 뷰(`PostContent`)에서 `prose` 스타일 내에서 올바르게 표시된다. `post.module.css`에 iframe 중앙 정렬 스타일을 추가한다.
- **Acceptance Criteria**: 블로그 포스팅 페이지에서 릴스가 세로로 좁은 형태(max-width 420px)로 중앙 정렬되어 표시된다.
- **Verification**: (BROWSER) 포스팅 preview 화면에서 reel 표시 확인

## Technical Design

### Architecture

```
src/app/admin/editor/extensions/InstagramReelExtension.ts  ← 신규
src/app/admin/editor/hooks/useEditorSetup.ts               ← 익스텐션 등록
src/app/admin/editor/hooks/useSlashMenu.ts                 ← slash 옵션 추가
src/app/admin/editor/components/FormattingToolbar.tsx      ← 툴바 버튼
src/app/admin/editor/BlogEditor.tsx                        ← insertReel 핸들러
src/app/blog/[slug]/post.module.css                        ← iframe prose 스타일
```

기존 유틸 재사용:
- `src/lib/instagram-url.ts` → `parseInstagramShortcode`, `buildReelEmbedUrl`

### HTML 출력 형식

```html
<div class="instagram-reel-wrapper">
  <iframe
    src="https://www.instagram.com/reel/{shortcode}/embed/"
    class="instagram-reel-embed"
    allow="encrypted-media; fullscreen"
    loading="lazy"
    title="Instagram reel"
  ></iframe>
</div>
```

### Dependencies

추가 npm 패키지 없음. 기존 `@tiptap/core` Node API 사용.

## Traceability Matrix

| REQ ID  | Description               | Verification | Status  |
|---------|---------------------------|--------------|---------|
| REQ-001 | TipTap 커스텀 Node 익스텐션 | (TEST)       | Pending |
| REQ-002 | URL 검증 및 삽입 핸들러    | (MANUAL)     | Pending |
| REQ-003 | 툴바 버튼                  | (BROWSER)    | Pending |
| REQ-004 | 슬래시 메뉴 옵션           | (BROWSER)    | Pending |
| REQ-005 | 블로그 포스팅 렌더링        | (BROWSER)    | Pending |

## Implementation Order

1. REQ-001 — 익스텐션이 기반. 커맨드가 없으면 나머지 불가
2. REQ-002 — 익스텐션 등록 후 핸들러 연결
3. REQ-003 — 핸들러가 있어야 툴바 버튼 연결 가능
4. REQ-004 — 툴바와 독립적이나 같은 핸들러 재사용
5. REQ-005 — 마지막으로 CSS 추가하여 렌더링 완성

## Out of Scope

- Instagram 임베드 스크립트(`//www.instagram.com/embed.js`) 로드 — 직접 embed URL 방식 사용
- 릴스 미리보기 썸네일 표시
- Instagram API 연동
