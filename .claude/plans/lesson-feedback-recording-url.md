# Lesson Feedback 수업 녹화 링크

## Overview

레슨 피드백 입력 시 "수업 녹화 파일 링크" URL 필드를 추가한다. 입력된 링크는 DB에 저장되고, 그로스 리포트(gangwon.html)에서 클릭 가능한 링크로 노출되어 기관이 수업 영상을 직접 볼 수 있도록 한다.

## Requirements

### REQ-001: DB 컬럼 추가 (마이그레이션)
- **Priority**: Must
- **Description**: `b2b_lesson_feedback` 테이블에 `recording_url text` 컬럼을 추가하는 마이그레이션(`084_b2b_lesson_feedback_recording_url.sql`)을 생성한다.
- **Verification**: (MANUAL) Supabase에 적용 후 SELECT로 컬럼 존재 확인

### REQ-002: 피드백 작성 폼에 녹화 링크 필드 추가
- **Priority**: Must
- **Description**: `lesson-feedback.html`의 시작/종료 시간 행 바로 아래에 "수업 녹화 파일 링크" URL 입력 필드 추가. INSERT 시 `recording_url` 포함. 제출 후 필드 초기화.
- **Verification**: (BROWSER) 링크 입력 후 저장 → DB에 값 저장 확인

### REQ-003: 그로스 리포트 피드백 아코디언에 링크 표시
- **Priority**: Must
- **Description**: `gangwon.html` `buildLessonItem()`의 sections 배열에 `recording_url` 항목 추가. 클릭 시 새 탭에서 열리는 링크로 표시.
- **Verification**: (BROWSER) 그로스 리포트 피드백 탭에서 링크 버튼 표시 확인

### REQ-004: 그로스 리포트 캘린더 날짜 팝업에 링크 표시
- **Priority**: Must
- **Description**: `gangwon.html` 캘린더 날짜 클릭 시 열리는 detail panel에도 `recording_url` 링크 표시.
- **Verification**: (BROWSER) 캘린더에서 날짜 클릭 후 링크 버튼 확인

### REQ-005: 레슨 피드백 뷰 페이지에 링크 표시
- **Priority**: Must
- **Description**: `lesson-feedback-view.html` `renderCard()`에 `recording_url` 섹션 추가.
- **Verification**: (BROWSER) 피드백 뷰 페이지에서 링크 확인

### REQ-006: public/ 미러 동기화
- **Priority**: Must
- **Description**: `public/partners/` 하위 3개 파일에도 동일 변경 적용.
- **Verification**: (MANUAL) 파일 비교 확인

## Technical Design

### Migration
```sql
ALTER TABLE public.b2b_lesson_feedback
  ADD COLUMN IF NOT EXISTS recording_url text;
```

### Form field (lesson-feedback.html)
시작/종료 시간 `form-row` 바로 아래에 추가:
```html
<div class="form-group">
  <label class="form-label" for="inp-recording">수업 녹화 파일 링크 <span style="color:var(--line);font-size:8px;">(선택)</span></label>
  <input type="url" id="inp-recording" placeholder="https://…" />
</div>
```
- INSERT: `recording_url: document.getElementById('inp-recording').value.trim() || null`
- Reset: `document.getElementById('inp-recording').value = ''`

### Growth report display (gangwon.html)
두 곳에 추가:
1. `buildLessonItem()` sections 배열:
```js
if (fb.recording_url) sections.push(`<div class="fb-section"><div class="fb-section-label">수업 녹화</div><div class="fb-section-text"><a href="${escHtml(fb.recording_url)}" target="_blank" rel="noopener">▶ 녹화 영상 보기</a></div></div>`);
```
2. 캘린더 detail panel (`recordingHtml`):
```js
const recordingHtml = fb.recording_url
  ? `<div class="dp-section"><div class="fb-section-label">수업 녹화</div><div class="fb-section-text"><a href="${escHtml(fb.recording_url)}" target="_blank" rel="noopener">▶ 녹화 영상 보기</a></div></div>` : '';
```

### Files to modify
- `supabase/migrations/084_b2b_lesson_feedback_recording_url.sql` (신규)
- `partners/lesson-feedback.html`
- `partners/gangwon.html`
- `partners/lesson-feedback-view.html`
- `public/partners/lesson-feedback.html`
- `public/partners/gangwon.html`  
- `public/partners/lesson-feedback-view.html`

## Traceability Matrix

| REQ ID  | Description                   | Verification | Status  |
|---------|-------------------------------|--------------|---------|
| REQ-001 | DB 컬럼 추가                  | (MANUAL)     | Pending |
| REQ-002 | 폼 필드 추가                  | (BROWSER)    | Pending |
| REQ-003 | 아코디언 링크                 | (BROWSER)    | Pending |
| REQ-004 | 캘린더 팝업 링크              | (BROWSER)    | Pending |
| REQ-005 | 뷰 페이지 링크                | (BROWSER)    | Pending |
| REQ-006 | public/ 동기화                | (MANUAL)     | Pending |

## Implementation Order
1. REQ-001 — DB 먼저
2. REQ-002 — 폼 (입력 → 저장 흐름)
3. REQ-003 + REQ-004 — 그로스 리포트 (동시)
4. REQ-005 — 뷰 페이지
5. REQ-006 — public/ 미러

## Out of Scope
- URL 유효성 검사 (type="url"로 브라우저 기본 검증만)
- 녹화 파일 직접 업로드 (링크만)
- 이전 피드백 히스토리 탭의 수정 기능에 녹화 링크 편집
