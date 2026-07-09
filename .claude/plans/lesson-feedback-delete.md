# Lesson Feedback Delete

## Overview

레슨 피드백 뷰 페이지(`lesson-feedback-view.html`)에서 중복·오작성된 피드백을 삭제할 수 있도록 한다. 각 카드에 삭제 버튼을 추가하고, 확인 후 Supabase에서 해당 레코드를 제거한다. DB RLS에 DELETE 정책이 없으므로 마이그레이션도 함께 추가한다.

## Requirements

### REQ-001: Supabase DELETE 정책 추가
- **Priority**: Must
- **Description**: `b2b_lesson_feedback` 테이블에 anon DELETE 정책을 추가하는 마이그레이션(`083_b2b_lesson_feedback_delete.sql`)을 생성한다.
- **Acceptance Criteria**: anon 키로 `.delete().eq('id', uuid)` 호출 시 성공한다.
- **Verification**: (MANUAL) Supabase에 마이그레이션 적용 후 삭제 동작 확인

### REQ-002: 삭제 버튼 UI
- **Priority**: Must
- **Description**: 각 `.fb-card`에 삭제 버튼을 추가한다. 카드 우측 상단에 작은 "삭제" 버튼을 배치하며, 기존 카드 레이아웃을 해치지 않는다.
- **Acceptance Criteria**: 각 피드백 카드 우측 상단에 "삭제" 버튼이 표시된다.
- **Verification**: (BROWSER) 피드백 목록 페이지에서 삭제 버튼 확인

### REQ-003: 삭제 확인 후 실행
- **Priority**: Must
- **Description**: 삭제 버튼 클릭 시 `confirm()` 다이얼로그로 확인을 요청한다. 확인 시 Supabase에서 해당 `id`로 삭제 후 카드를 DOM에서 제거한다. 취소 시 아무것도 하지 않는다.
- **Acceptance Criteria**: 확인 클릭 → 카드 사라짐. 취소 클릭 → 변화 없음.
- **Verification**: (BROWSER) 삭제 버튼 클릭 후 확인/취소 동작 확인

### REQ-004: 삭제 중 로딩·오류 처리
- **Priority**: Should
- **Description**: 삭제 API 호출 중 버튼을 비활성화하고 "삭제 중…" 상태 표시. 오류 시 `alert()`으로 안내.
- **Acceptance Criteria**: 삭제 중 버튼 disabled. 오류 시 오류 메시지 alert.
- **Verification**: (BROWSER) 네트워크 지연 상황에서 버튼 상태 확인

### REQ-005: public/ 미러 동기화
- **Priority**: Must
- **Description**: `public/partners/lesson-feedback-view.html`에도 동일한 변경을 적용한다.
- **Verification**: (MANUAL) 두 파일 변경 확인

## Technical Design

### Migration (083)
```sql
CREATE POLICY "b2b_fb_anon_delete"
  ON public.b2b_lesson_feedback
  FOR DELETE TO anon
  USING (true);
```

### UI 변경 (renderCard 함수)
- `.fb-card-header`를 flex + justify-content: space-between으로 변경
- 우측에 삭제 버튼 추가: `<button class="fb-del-btn" onclick="deleteFeedback('${fb.id}', this)">삭제</button>`

### JS 추가 (deleteFeedback 함수)
```js
async function deleteFeedback(id, btn) {
  if (!confirm('이 피드백을 삭제할까요?')) return;
  btn.disabled = true;
  btn.textContent = '삭제 중…';
  const { error } = await sb.from('b2b_lesson_feedback').delete().eq('id', id);
  if (error) { alert('삭제 실패: ' + error.message); btn.disabled = false; btn.textContent = '삭제'; return; }
  btn.closest('.fb-card').remove();
}
```

### Files to modify
- `supabase/migrations/083_b2b_lesson_feedback_delete.sql` (신규)
- `partners/lesson-feedback-view.html`
- `public/partners/lesson-feedback-view.html`

## Traceability Matrix

| REQ ID  | Description               | Verification | Status  |
|---------|---------------------------|--------------|---------|
| REQ-001 | DELETE 정책 마이그레이션   | (MANUAL)     | Pending |
| REQ-002 | 삭제 버튼 UI              | (BROWSER)    | Pending |
| REQ-003 | 확인 후 삭제              | (BROWSER)    | Pending |
| REQ-004 | 로딩·오류 처리            | (BROWSER)    | Pending |
| REQ-005 | public/ 동기화            | (MANUAL)     | Pending |

## Implementation Order

1. REQ-001 — DB 먼저 (UI가 작동하려면 정책이 있어야 함)
2. REQ-002 + REQ-003 + REQ-004 — UI·JS 동시
3. REQ-005 — 미러 동기화

## Out of Scope

- 별도 인증(PIN 재확인) 없이 confirm()으로 처리 (기존 뷰 페이지도 인증 없음)
- 복원(undo) 기능
