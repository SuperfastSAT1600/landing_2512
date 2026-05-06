# Coaches Feature — 코치 소개 랜딩 페이지 시스템

## Overview

어드민에서 코치 프로필을 관리하고, 공개 URL(`/coaches/[slug]`)로 학부모에게 코치를 소개하는 시스템.
기존 `posts.author` 필드와 리뷰 시스템을 재활용해 추가 인프라 최소화.

---

## Requirements

### REQ-001: 작성자 데이터 정리 (DB 마이그레이션)
- **Priority**: Must
- **Description**: posts 테이블에서 배병윤, Jake, Brandon → SuperfastSAT으로 통합
- **Acceptance Criteria**: DB 조회 시 해당 author 값이 SuperfastSAT으로 변경됨. Jimmy는 유지.
- **Verification**: (TEST) DB 쿼리로 확인

### REQ-002: coaches 데이터 스토어
- **Priority**: Must
- **Description**: `src/data/coaches.json` + `src/lib/coaches-data.ts` 생성. reviews 패턴과 동일하게.
- **Acceptance Criteria**: Coach 타입 정의 (slug, name, photo, bio, curriculum, isActive). CRUD 헬퍼 함수.
- **Verification**: (TEST) 타입 체크 통과

### REQ-003: 코치 관리 API
- **Priority**: Must
- **Description**: `GET/POST/PATCH/DELETE /api/admin/coaches` — 어드민 인증 필요
- **Acceptance Criteria**: 코치 목록 조회, 생성, 수정, 삭제 가능. x-admin-key 없으면 401.
- **Verification**: (TEST) API 응답 확인

### REQ-004: 어드민 Coaches 메뉴
- **Priority**: Must
- **Description**: 어드민 사이드바에 Coaches 메뉴 추가 + `/admin/coaches` 페이지 구현
- **Acceptance Criteria**: 코치 목록 보기, 코치 추가/편집(이름, slug, 사진, 소개, 커리큘럼), 리뷰 링크 복사 버튼
- **Verification**: (BROWSER) 어드민에서 코치 생성/편집/삭제 동작 확인

### REQ-005: 에디터 author 드롭다운 교체
- **Priority**: Must
- **Description**: 포스팅 에디터의 author 텍스트 입력 → coaches 목록 + SuperfastSAT 드롭다운으로 교체
- **Acceptance Criteria**: 드롭다운에 SuperfastSAT + 활성 코치들이 표시됨. 저장 시 선택값이 author에 저장됨.
- **Verification**: (BROWSER) 에디터에서 코치 선택 후 포스팅 저장, author 값 확인

### REQ-006: 리뷰에 coachSlug 필드 추가
- **Priority**: Must
- **Description**: ReviewData 타입에 `coachSlug?: string` 추가. 리뷰 작성 URL에 `?coach=jimmy` 파라미터 지원.
- **Acceptance Criteria**: `/reviews/write?coach=jimmy`로 접근하면 coachSlug='jimmy'가 저장된 리뷰 생성됨.
- **Verification**: (TEST) 리뷰 데이터에 coachSlug 필드 존재 확인

### REQ-007: 리뷰 작성 페이지 안내 문구 업데이트
- **Priority**: Must
- **Description**: `?coach=slug` 파라미터가 있을 때 "코치 수업 후기" 맥락에 맞는 안내 문구 표시
- **Acceptance Criteria**: coach 파라미터 있으면 코치 이름이 안내에 표시됨. 없으면 기존 문구 유지.
- **Verification**: (BROWSER) `/reviews/write?coach=jimmy` 접속 시 문구 확인

### REQ-008: 공개 코치 프로필 페이지
- **Priority**: Must
- **Description**: `/coaches/[slug]` — 탭 네비게이션 (코치 소개 / 커리큘럼 / 아티클 / 수업 후기)
- **Acceptance Criteria**:
  - 프로필 사진, 이름, 소개 멘트 표시
  - 아티클 탭: posts 테이블에서 author=slug 필터 후 카드 그리드
  - 수업 후기 탭: reviews에서 coachSlug=slug + status=published 필터
  - 존재하지 않는 slug → 404
- **Verification**: (BROWSER) `/coaches/jimmy` 접속 시 각 탭 확인

---

## Technical Design

### Architecture

```
src/
├── data/
│   └── coaches.json                    # 코치 데이터 스토어 (reviews.json 패턴)
├── lib/
│   └── coaches-data.ts                 # CRUD 헬퍼 (reviews-data.ts 패턴)
├── app/
│   ├── api/
│   │   └── admin/
│   │       └── coaches/route.ts        # 코치 CRUD API
│   ├── admin/
│   │   ├── layout.tsx                  # NAV_ITEMS에 Coaches 추가
│   │   ├── coaches/
│   │   │   └── page.tsx               # 어드민 코치 관리 페이지
│   │   └── editor/page.tsx            # author 드롭다운 교체
│   ├── coaches/
│   │   └── [slug]/
│   │       └── page.tsx               # 공개 코치 프로필 페이지
│   └── reviews/
│       └── write/page.tsx             # coachSlug + 안내 문구 업데이트
└── lib/
    └── reviews-data.ts                 # coachSlug 필드 추가
```

### Coach 타입

```typescript
export interface CoachData {
    slug: string;                    // URL identifier (jimmy)
    name: string;                    // 표시 이름 (Jimmy)
    photo: string;                   // 이미지 URL
    bio: string;                     // 소개 멘트 (1-2문단)
    curriculumPostSlug: string;      // 커리큘럼 탭에 전체 렌더링할 포스팅 slug
    isActive: boolean;               // 공개 여부
}
```

### 공개 코치 페이지 탭 구조

```
/coaches/jimmy
┌─────────────────────────────────────────┐
│ [코치 소개] [커리큘럼] [아티클] [수업 후기] │  ← 탭 네비게이션
├─────────────────────────────────────────┤
│ 프로필 사진 + 이름 + 소개                  │
│                                         │
│ (탭별 콘텐츠)                            │
└─────────────────────────────────────────┘
```

### 리뷰 링크 구조

- 코치별 리뷰 링크: `/reviews/write?coach=jimmy`
- 어드민 Coaches 페이지에서 링크 복사 버튼 제공

### 의존성

- 기존: Supabase (posts), reviews.json, upload API
- 신규: coaches.json (파일 기반, reviews 패턴 동일)

---

## Traceability Matrix

| REQ ID  | Description                  | Verification | 확인 방법                              | Status  |
|---------|------------------------------|--------------|---------------------------------------|---------|
| REQ-001 | DB author 통합                | (TEST)       | Supabase 쿼리                         | Pending |
| REQ-002 | coaches 데이터 스토어          | (TEST)       | 타입 체크                              | Pending |
| REQ-003 | 코치 관리 API                 | (TEST)       | curl 테스트                            | Pending |
| REQ-004 | 어드민 Coaches 메뉴           | (BROWSER)    | /admin/coaches 접속                   | Pending |
| REQ-005 | 에디터 author 드롭다운         | (BROWSER)    | 에디터에서 코치 선택                    | Pending |
| REQ-006 | 리뷰 coachSlug 필드           | (TEST)       | 리뷰 데이터 확인                        | Pending |
| REQ-007 | 리뷰 작성 안내 문구            | (BROWSER)    | /reviews/write?coach=jimmy 접속       | Pending |
| REQ-008 | 공개 코치 프로필 페이지         | (BROWSER)    | /coaches/jimmy 각 탭 확인             | Pending |

---

## Implementation Order

1. **REQ-001** — DB 마이그레이션 먼저 (다른 모든 것의 기반)
2. **REQ-002** — coaches.json + coaches-data.ts (API의 기반)
3. **REQ-003** — 코치 CRUD API
4. **REQ-004** — 어드민 Coaches 페이지
5. **REQ-005** — 에디터 드롭다운 (coaches API 필요)
6. **REQ-006** — 리뷰 coachSlug 추가
7. **REQ-007** — 리뷰 작성 페이지 문구
8. **REQ-008** — 공개 코치 프로필 페이지 (모든 것이 준비된 후)

---

## Out of Scope

- 코치 로그인 / 코치 직접 포스팅
- 코치 페이지 SEO 메타태그 (추후)
- 코치 통계 (담당 학생 수 등)
- 코치 간 비교 페이지
