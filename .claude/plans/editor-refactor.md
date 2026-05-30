# Admin Editor Refactor

## Overview

`src/app/admin/editor/page.tsx`가 1,566줄 단일 파일로 되어 있어 유지보수 난이도가 높다.
기능 경계에 따라 파일을 분리해 각 파일이 200줄 이하가 되도록 리팩토링한다.
**동작은 100% 동일하게 유지.** UI/UX 변경 없음.

## 분리 전략

### 현재 구조 (1,566줄 단일 파일)
- ImageNodeView / CustomImage (Tiptap 확장)
- BlogEditor (메인 컴포넌트)
  - 상태 30+ 개
  - useEditor Tiptap 설정
  - loadPost / handleSave (API 호출)
  - handleGenerateSeo / handleGenerateSlug (AI)
  - handleImageUpload × 3 (featured / card / inline)
  - insertYoutube / insertLink / handleAlign
  - SlashMenu 옵션 정의 + 키보드 핸들러
  - JSX: Header / Toolbar / SlashMenu / AltTextDialog / Canvas(edit|split|preview) / SettingsSidebar

### 목표 구조
```
src/app/admin/editor/
├── page.tsx                    (~40줄 — Suspense 래퍼만)
├── BlogEditor.tsx              (~80줄 — 상태 조합 + 레이아웃)
├── hooks/
│   ├── useEditorSetup.ts       (~80줄 — useEditor + CustomImage + ImageNodeView)
│   ├── usePostForm.ts          (~120줄 — 폼 상태 30개 + loadPost + handleSave)
│   ├── useImageUpload.ts       (~90줄 — 3가지 업로드 핸들러 + altText dialog)
│   └── useSlashMenu.ts         (~60줄 — slashOptions + handleEditorKeyDown)
├── components/
│   ├── EditorHeader.tsx        (~70줄 — 헤더 nav + viewMode 토글 + Publish 버튼)
│   ├── FormattingToolbar.tsx   (~150줄 — 서식 버튼 전체)
│   ├── SlashMenu.tsx           (~50줄 — 슬래시 커맨드 오버레이)
│   ├── AltTextDialog.tsx       (~60줄 — 인라인 이미지 alt text 모달)
│   ├── EditorCanvas.tsx        (~120줄 — edit/split/preview 뷰 모드)
│   └── SettingsSidebar.tsx     (~220줄 — 사이드바 + General탭 + SEO탭)
```

## Requirements

### REQ-001: hooks/usePostForm.ts 추출
- **Priority**: Must
- **Description**: 폼 상태(title, slug, date, category, author, coaches, excerpt, description, tags, featuredImage, featureImage, featuredImageAlt, focusKeyword, metaTitle, metaRobots, accessCode, ctaFeatured, settingsTab, viewMode, showSettings, loading, saving) + loadPost + handleSave 분리
- **Acceptance Criteria**: 에디터 페이지에서 포스트 저장/불러오기가 동일하게 동작
- **Verification**: (MANUAL) 기존 포스트 수정 후 Update 클릭 → 정상 저장 확인

### REQ-002: hooks/useEditorSetup.ts 추출
- **Priority**: Must
- **Description**: ImageNodeView, CustomImage extension, useEditor 설정 전체 분리. editor 인스턴스와 pendingContent 관련 refs 반환
- **Acceptance Criteria**: Tiptap 에디터가 동일하게 마운트되고 기존 포스트 로드 시 콘텐츠가 정상 표시
- **Verification**: (MANUAL) 기존 포스트 열기 → 본문 정상 표시 확인

### REQ-003: hooks/useImageUpload.ts 추출
- **Priority**: Must
- **Description**: handleImageUpload(featured), handleFeatureImageUpload(card), handleInlineUpload(inline) + altTextDialog 상태 + confirmAltText 분리
- **Acceptance Criteria**: 3가지 이미지 업로드가 모두 정상 동작
- **Verification**: (MANUAL) 인라인 이미지 붙여넣기 → alt text 다이얼로그 → 에디터 삽입 확인

### REQ-004: hooks/useSlashMenu.ts 추출
- **Priority**: Must
- **Description**: slashOptions 배열, showSlashMenu/slashMenuIndex 상태, handleEditorKeyDown, runSlashCommand 분리
- **Acceptance Criteria**: `/` 입력 시 슬래시 메뉴 정상 동작, 키보드 화살표/Enter/Escape 동작
- **Verification**: (MANUAL) 빈 줄에 `/` 입력 → 메뉴 출력 → H1 선택 → 헤딩 삽입 확인

### REQ-005: 컴포넌트 파일 분리
- **Priority**: Must
- **Description**: EditorHeader, FormattingToolbar, SlashMenu, AltTextDialog, EditorCanvas, SettingsSidebar를 별도 파일로 분리
- **Acceptance Criteria**: 에디터의 모든 UI가 동일하게 렌더링됨
- **Verification**: (MANUAL) 에디터 전체 UI 시각 확인 (헤더/툴바/캔버스/사이드바)

### REQ-006: page.tsx + BlogEditor.tsx 정리
- **Priority**: Must
- **Description**: page.tsx는 Suspense 래퍼만, BlogEditor.tsx는 hooks 조합 + 레이아웃 컴포넌트 조립만 담당
- **Acceptance Criteria**: page.tsx 40줄 이하, BlogEditor.tsx 100줄 이하
- **Verification**: (MANUAL) wc -l로 파일 크기 확인

## Technical Design

### 인터페이스 설계 원칙
- hooks는 필요한 값/함수만 반환 (over-exposure 금지)
- 컴포넌트 간 공유 상태는 BlogEditor.tsx에서 내려줌 (prop drilling 허용, Context 도입 금지)
- 기존 파일의 import 경로(`@/components/editor/...`)는 변경하지 않음
- 타입 변경 없음

### 파일 이동 범위
- 새 파일 생성: `src/app/admin/editor/hooks/` 4개, `src/app/admin/editor/components/` 6개
- 기존 파일 수정: `src/app/admin/editor/page.tsx` (Suspense만 남김)
- 신규 파일: `src/app/admin/editor/BlogEditor.tsx`

### Dependencies
- @tiptap/* (기존 그대로)
- lucide-react (기존 그대로)
- 외부 API 변경 없음

## Traceability Matrix

| REQ ID  | Description              | Verification | Status  |
|---------|--------------------------|--------------|---------|
| REQ-001 | usePostForm 추출         | (MANUAL)     | Pending |
| REQ-002 | useEditorSetup 추출      | (MANUAL)     | Pending |
| REQ-003 | useImageUpload 추출      | (MANUAL)     | Pending |
| REQ-004 | useSlashMenu 추출        | (MANUAL)     | Pending |
| REQ-005 | 컴포넌트 파일 분리        | (MANUAL)     | Pending |
| REQ-006 | page.tsx + BlogEditor 정리| (MANUAL)    | Pending |

## Implementation Order

1. REQ-002 — useEditorSetup (다른 hooks/컴포넌트가 editor 인스턴스를 필요로 함)
2. REQ-001 — usePostForm (가장 많은 상태 포함, 먼저 분리해야 컴포넌트 분리가 쉬움)
3. REQ-003 — useImageUpload (usePostForm의 setFeaturedImage 등 setter 필요)
4. REQ-004 — useSlashMenu (editor 인스턴스 필요)
5. REQ-005 — 컴포넌트 분리 (모든 hooks 완료 후)
6. REQ-006 — page.tsx + BlogEditor 정리 (마지막)

## Out of Scope

- 기능 추가/변경 없음
- UI 변경 없음
- API 변경 없음
- 테스트 추가 없음 (에디터는 E2E가 필요한 UI — 이번 작업 범위 외)
- Context API 도입 없음
