# Multi-Domain Sitemap & Robots

## Overview

`sitemap.ts`와 `robots.ts`가 `www.superfastsat.com`으로 하드코딩되어 있어 `tutoring.superfastsat.com`에서는 잘못된 URL 목록이 반환됨. request host 헤더를 감지해 도메인별로 적절한 sitemap을 반환하도록 수정.

## Requirements

### REQ-001: sitemap.ts — host 기반 동적 URL 생성
- **Priority**: Must
- **Description**: `headers()`로 request host를 감지해 baseUrl을 결정. tutoring 도메인이면 앱 페이지(/, /diagnosis)만 반환. 메인 도메인이면 기존 블로그 포스트 포함 sitemap 반환.
- **Acceptance Criteria**: `tutoring.superfastsat.com/sitemap.xml` → tutoring URL 목록 반환. `www.superfastsat.com/sitemap.xml` → 기존 블로그 포함 목록 반환.
- **Verification**: (MANUAL) 각 도메인에서 /sitemap.xml 접근 후 URL 확인

### REQ-002: robots.ts — host 기반 sitemap URL 수정
- **Priority**: Must
- **Description**: `headers()`로 host를 감지해 sitemap URL이 해당 도메인을 가리키도록 수정.
- **Acceptance Criteria**: `tutoring.superfastsat.com/robots.txt` → `Sitemap: https://tutoring.superfastsat.com/sitemap.xml`
- **Verification**: (MANUAL) 각 도메인에서 /robots.txt 접근 후 Sitemap 줄 확인

## Technical Design

### Architecture
- Next.js App Router의 `headers()` from `next/headers` 사용 (dynamic rendering)
- tutoring 도메인 판별: `host.startsWith('tutoring.')`
- tutoring sitemap: `/`, `/diagnosis` 2개 페이지

## Traceability Matrix

| REQ ID  | Description | Verification | Status  |
|---------|-------------|--------------|---------|
| REQ-001 | sitemap host-based routing | (MANUAL) | Pending |
| REQ-002 | robots sitemap URL fix | (MANUAL) | Pending |

## Out of Scope

- /reports/[resultId] 색인 (사용자별 private 페이지)
- /admin/* 색인
