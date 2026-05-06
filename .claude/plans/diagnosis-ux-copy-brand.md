# Spec: Diagnosis UX Copy & Brand Tone

## Overview

진단 테스트 전체 플로우에서 버튼 문구를 단계별 맥락에 맞게 수정하고,
DiagnosticTestView 인트로 화면을 브랜드 톤으로 정렬. 중복 텍스트 제거.

**Affected files**:
- `src/app/diagnosis/page.tsx`
- `src/app/diagnosis/components/DiagnosticTestView.tsx`

---

## Current vs Target Copy

### Button labels (page.tsx)

| Phase | 현재 | 문제 | 변경 후 |
|-------|------|------|---------|
| student-confirm | "Yes, Start Test" | 아직 시험 시작 아님 | "That's me — Continue" |
| email-input | "Start Test" | 인트로 화면이 한 단계 더 남음 | "Continue" |
| DiagnosticTestView intro | "Start Test" | 실제 시험 시작 맞음 | "Begin Test" |

### Text issues (DiagnosticTestView.tsx intro)

| 현재 | 문제 | 변경 후 |
|------|------|---------|
| `{title}` → "Diagnostic Test #1" | "#1" 불필요 | "SAT Diagnostic Test" |
| `<p>SAT Diagnostic Test</p>` | 위와 중복 | 제거 → 대신 30분 + 문항수 한줄 요약 |

### DiagnosticTestView intro 브랜드 톤

| 항목 | 현재 | 변경 후 |
|------|------|---------|
| 배경 | `#F4F5F9` (toss light) | `#000000` (`--bg-base`) |
| 카드 | `toss-card` (흰 카드) | `bg-[#09090b]` 다크 카드 |
| 아이콘 박스 | `toss-icon-box-blue` (#3182F6) | `#071be9` 브랜드 블루 |
| 아이콘 stroke | `#3182F6` | `#6085FF` |
| 버튼 | `btn-toss btn-press` | `bg-[#071be9] hover:bg-[#1a31f0]` 브랜드 스타일 |
| 텍스트 | `text-gray-900`, `text-gray-500` | `text-white`, `text-gray-400` |
| 메타 정보 (시간/문항) | `text-gray-400`, `border-gray-100` | `text-gray-400`, `border-white/10` |

---

## Requirements

### REQ-001: 버튼 문구 단계별 맥락화 (BROWSER)
- student-confirm: "That's me — Continue"
- email-input: "Continue"
- DiagnosticTestView intro: "Begin Test"

### REQ-002: 중복/불필요 텍스트 제거 (BROWSER)
- 인트로 h1: "#1" 제거 → "SAT Diagnostic Test" (testData.title 대신 고정 문자열)
- 인트로 p "SAT Diagnostic Test" 제거 → directions 바로 표시

### REQ-003: 인트로 화면 브랜드 다크 톤 적용 (BROWSER)
- 배경 `#F4F5F9` → `#000000`
- 카드 흰색 → `#09090b`
- 아이콘/버튼 → 브랜드 블루 `#071be9`
- 텍스트 다크 → 라이트 (white/gray-400)

---

## Traceability Matrix

| REQ ID | Description | Verification | Location |
|--------|-------------|-------------|----------|
| REQ-001 | 버튼 문구 맥락화 | (BROWSER) | page.tsx + DiagnosticTestView.tsx |
| REQ-002 | 중복 텍스트 제거 | (BROWSER) | DiagnosticTestView.tsx |
| REQ-003 | 인트로 브랜드 톤 | (BROWSER) | DiagnosticTestView.tsx |

---

## Implementation Steps

**Step 1**: `page.tsx` — student-confirm, email-input 버튼 텍스트 변경 (REQ-001)

**Step 2**: `DiagnosticTestView.tsx` intro 화면 전체 수정 (REQ-001, REQ-002, REQ-003)
- h1: "SAT Diagnostic Test" 고정
- p "SAT Diagnostic Test" 삭제
- 배경/카드/아이콘/버튼 다크 브랜드 톤
