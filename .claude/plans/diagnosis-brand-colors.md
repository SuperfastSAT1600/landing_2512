# Spec: Diagnostic Test Page Brand Color Alignment

## Overview

진단 테스트 페이지의 색상을 랜딩페이지 브랜드 컬러와 통일.

**Goal**: 버튼 색상 `#071be9` 적용, 배경/카드/포커스 컬러를 랜딩페이지 CSS 변수와 맞춤.

**Affected file**: `src/app/diagnosis/page.tsx`

---

## Color Mapping

| 현재 값 | 변경 값 | 용도 |
|---------|---------|------|
| `bg-[#151719]` | `bg-[#000000]` (`--bg-base`) | 페이지 배경 |
| `bg-[#1e2023]` | `bg-[#09090b]` (`--bg-surface`) | 카드 배경 |
| `bg-blue-600 hover:bg-blue-500` | `bg-[#071be9] hover:bg-[#1a31f0]` | 버튼 |
| `focus:border-blue-500` | `focus:border-[#071be9]` | 인풋 포커스 |
| `focus:ring-blue-500` | `focus:ring-[#071be9]` | 인풋 포커스 링 |
| `shadow-blue-900/20` | `shadow-[#071be9]/20` | 버튼 그림자 |
| `border-white/10` | `border-white/8` | 카드/인풋 테두리 |

---

## Requirements

### REQ-001: 버튼 색상 #071be9 적용 (BROWSER)
- 모든 primary 버튼: `bg-[#071be9]` / `hover:bg-[#1a31f0]`
- code-entry, student-confirm, email-input 세 화면 전체

### REQ-002: 배경색 랜딩페이지와 통일 (BROWSER)
- 페이지 배경: `#000000`
- 카드/패널 배경: `#09090b`
- 인풋 배경(dark inset): `#000000`

### REQ-003: 포커스 컬러 브랜드 블루로 (BROWSER)
- 인풋 focus ring/border: `#071be9`

---

## Traceability Matrix

| REQ ID | Description | Verification | Location |
|--------|-------------|-------------|----------|
| REQ-001 | 버튼 색상 #071be9 | (BROWSER) | diagnosis/page.tsx |
| REQ-002 | 배경 색상 통일 | (BROWSER) | diagnosis/page.tsx |
| REQ-003 | 포커스 컬러 | (BROWSER) | diagnosis/page.tsx |

---

## Implementation

모든 변경은 `src/app/diagnosis/page.tsx` 단일 파일.

- `bg-[#151719]` → `bg-[#000000]` (replace_all)
- `bg-[#1e2023]` → `bg-[#09090b]` (replace_all)
- `bg-blue-600 hover:bg-blue-500` → `bg-[#071be9] hover:bg-[#1a31f0]` (replace_all)
- `focus:border-blue-500` → `focus:border-[#071be9]` (replace_all)
- `focus:ring-blue-500` → `focus:ring-[#071be9]` (replace_all)
- `shadow-blue-900/20` → `shadow-[#071be9]/20` (replace_all)
