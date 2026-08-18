# Lesson Feedback 이전 피드백 탭 수정·삭제

## Overview

`lesson-feedback.html`의 "이전 피드백" 탭에서 각 카드의 수정·삭제를 완성한다. 수정 골격(`openEdit`/`saveEdit`)은 이미 있으나 삭제 버튼 없음, 시간·녹화 링크 필드 누락, UPDATE 페이로드 불완전 등 세 가지 문제가 있다.

## Requirements

### REQ-001: 히스토리 카드에 삭제 버튼 추가
- **Priority**: Must
- **Description**: `renderCard()`의 카드 헤더에 "수정" 버튼 옆 "삭제" 버튼 추가. 확인 후 Supabase DELETE → 카드 DOM 제거 → `allFeedbacks` 배열에서도 제거.
- **Verification**: (BROWSER) 이전 피드백 탭에서 삭제 버튼 동작 확인

### REQ-002: 수정 폼에 시작/종료 시간 + 녹화 링크 필드 추가
- **Priority**: Must
- **Description**: `card-edit-form` 내에 `start_time`, `end_time`, `recording_url` 입력 필드 추가. 현재 저장된 값으로 초기값 세팅.
- **Verification**: (BROWSER) 수정 폼 열었을 때 시간·링크 필드 표시 확인

### REQ-003: saveEdit() UPDATE 페이로드 완성
- **Priority**: Must
- **Description**: `saveEdit()`에서 `start_time`, `end_time`, `recording_url`을 UPDATE에 포함. 로컬 캐시(`allFeedbacks[idx]`)도 동일하게 반영.
- **Verification**: (BROWSER) 시간·링크 수정 후 저장 → 새로고침 시 반영 확인

### REQ-004: 카드 뷰에 시간·녹화 링크 표시
- **Priority**: Should
- **Description**: 히스토리 카드 뷰(`view-${fid}`)에 `start_time`/`end_time`/`recording_url` 표시 추가.
- **Verification**: (BROWSER) 이전 피드백 카드에서 시간·링크 표시 확인

### REQ-005: public/ 미러 동기화
- **Priority**: Must
- **Description**: `public/partners/lesson-feedback.html`에도 동일 변경.
- **Verification**: (MANUAL) 두 파일 일치 확인

## Technical Design

### 삭제 버튼 (REQ-001)
카드 헤더에 수정 버튼 옆 추가:
```html
<button class="fb-del-btn" onclick="deleteCard('${fid}', this)">삭제</button>
```
CSS: `.fb-del-btn`은 `lesson-feedback-view.html`에 이미 정의한 스타일과 동일하게 추가.

```js
async function deleteCard(fid, btn) {
  if (!confirm('이 피드백을 삭제할까요?')) return;
  btn.disabled = true; btn.textContent = '삭제 중…';
  const { error } = await sb.from('b2b_lesson_feedback').delete().eq('id', fid);
  if (error) { alert('삭제 실패: ' + error.message); btn.disabled = false; btn.textContent = '삭제'; return; }
  document.getElementById(`card-${fid}`).remove();
  allFeedbacks = allFeedbacks.filter(f => f.id !== fid);
}
```

### 수정 폼 필드 추가 (REQ-002)
숙제 textarea 아래에 추가:
```html
<div class="form-row" style="margin-bottom:28px;">
  <div class="form-group" style="margin-bottom:0">
    <label class="form-label">수업 시작 시간</label>
    <input type="time" id="${fkey}_start" value="${fb.start_time?.slice(0,5)||''}" />
  </div>
  <div class="form-group" style="margin-bottom:0">
    <label class="form-label">수업 종료 시간</label>
    <input type="time" id="${fkey}_end" value="${fb.end_time?.slice(0,5)||''}" />
  </div>
</div>
<div class="form-group">
  <label class="form-label">수업 녹화 파일 링크</label>
  <input type="url" id="${fkey}_rec" placeholder="https://…" value="${escAttr(fb.recording_url||'')}" />
</div>
```

### saveEdit() 업데이트 (REQ-003)
UPDATE 페이로드에 추가:
```js
start_time:    document.getElementById(`${fkey}_start`).value || null,
end_time:      document.getElementById(`${fkey}_end`).value   || null,
recording_url: document.getElementById(`${fkey}_rec`).value.trim() || null,
```

### Files to modify
- `partners/lesson-feedback.html`
- `public/partners/lesson-feedback.html`

## Traceability Matrix
| REQ ID  | Description              | Verification | Status  |
|---------|--------------------------|--------------|---------|
| REQ-001 | 삭제 버튼                | (BROWSER)    | Pending |
| REQ-002 | 수정 폼 시간·링크 필드   | (BROWSER)    | Pending |
| REQ-003 | saveEdit 페이로드 완성   | (BROWSER)    | Pending |
| REQ-004 | 카드 뷰 시간·링크 표시   | (BROWSER)    | Pending |
| REQ-005 | public/ 동기화           | (MANUAL)     | Pending |

## Implementation Order
1. REQ-001 — 삭제 (독립적)
2. REQ-002 + REQ-003 — 수정 폼 + 저장 (연결)
3. REQ-004 — 뷰 표시 (독립)
4. REQ-005 — 미러

## Out of Scope
- 출석/결석 체크박스 UI (현재 textarea 방식 유지)
