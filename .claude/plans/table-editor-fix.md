# Spec: Blog Editor — Table UX Fixes

## Root Cause Analysis

### 문제 1: 표 안에 내용 수정이 어려워
**현황**: TableBubbleMenu가 커서가 표 안에 있을 때 항상 위에 뜸.
**원인**: `shouldShow`가 `isActive('table') || isActive('tableCell') || isActive('tableHeader')` → 셀 안에서 타이핑할 때도 메뉴가 덮음. Tab으로 셀 이동 가능하지만 UX가 불명확.
**근본**: 사용자가 표 안에서 셀 이동/텍스트 편집하는 동작이 직관적이지 않음.

### 문제 2: 표 안에 내용들 전체 서식 수정도 안 됨
**현황**: 상단 고정 툴바(Bold/Italic/align 등)는 현재 포커스된 단일 셀에만 작동.
**원인**: 여러 셀을 동시에 선택(CellSelection)한 뒤 mark 적용이 안 됨.
Tiptap의 CellSelection은 ProseMirror TextSelection과 달리 mark 명령이 각 셀의 paragraph까지 내려가지 않음.
**근본**: `toggleBold()` 등 명령이 CellSelection에서 셀 내부의 텍스트 노드까지 적용 안 됨.

### 문제 3: 표 병합도 안 됨 (가장 명확한 버그)
**현황**: TableBubbleMenu에 `mergeCells()` / `splitCell()` 버튼이 없음.
**원인**: 기능 구현 누락. Tiptap `@tiptap/extension-table`은 이미 mergeCells/splitCell/mergeOrSplit 명령을 내장 지원함.
**Fix**: TableBubbleMenu에 버튼 추가.

---

## Requirements

### REQ-001 (BROWSER): 셀 병합 버튼 표시 및 동작
여러 셀 선택 후 TableBubbleMenu에 "셀 병합" 버튼이 보이고, 클릭 시 셀이 병합됨.
`editor.can().mergeCells()` 가 true일 때만 활성화.

### REQ-002 (BROWSER): 셀 분할 버튼 표시 및 동작
병합된 셀 안에 커서가 있을 때 "셀 분할" 버튼이 표시되고 동작함.
`editor.can().splitCell()` 가 true일 때만 활성화.

### REQ-003 (BROWSER): 셀 안에서 Bold/Italic/정렬 서식 적용
단일 셀 텍스트 선택 후 상단 툴바 Bold 클릭 → 해당 텍스트에 bold 적용됨.
(다중 셀 동시 서식은 Tiptap CellSelection 한계로 scope-out)

### REQ-004 (BROWSER): Tab/Shift+Tab으로 셀 이동
표 안에서 Tab 키로 다음 셀, Shift+Tab으로 이전 셀로 이동함.

### REQ-005 (BROWSER): TableBubbleMenu가 텍스트 편집 방해 안 함
BubbleMenu가 셀 위에 뜨더라도 셀 안 텍스트 타이핑 가능하고, 메뉴 dismiss 후 편집 가능.

---

## Implementation Plan

### 변경 파일: `src/components/editor/TableBubbleMenu.tsx`

**추가할 버튼:**
```tsx
// mergeCells — editor.can().mergeCells()가 true일 때만 활성화
<button
  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().mergeCells().run(); }}
  disabled={!editor.can().mergeCells()}
  title="셀 병합"
  className={...}
>
  <Combine size={14} />
</button>

// splitCell — editor.can().splitCell()가 true일 때만 활성화
<button
  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().splitCell().run(); }}
  disabled={!editor.can().splitCell()}
  title="셀 분할"
  className={...}
>
  <SplitSquareHorizontal size={14} />
</button>
```

**BubbleMenu shouldShow 수정**: 표 구조 작업용 vs 단순 셀 포커스 구분은 유지.
현재 로직은 적절. 단, `tippyOptions` → `options` (Tiptap v3 API) 이미 올바름.

### E2E 테스트 파일: `tests/e2e/table-editor.spec.ts`
- localStorage `admin_key` 세팅
- 표 삽입 → 셀 이동 → 병합 → 분할 → 서식 적용 흐름 검증

---

## Files
- 수정: `src/components/editor/TableBubbleMenu.tsx`
- 생성: `tests/e2e/table-editor.spec.ts`
