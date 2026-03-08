# Spec: Vocabulary Save Button Auto-Dismiss

**Author**: Architect Agent
**Date**: 2026-03-07
**Status**: Draft

---

## Overview

The floating Save button that appears when a student clicks a word during the diagnostic test currently stays visible until another word is clicked. This creates visual clutter and distraction during test-taking. This spec defines four dismissal triggers so the button disappears automatically when the user is no longer actively deciding whether to save a word.

---

## Requirements

### REQ-001: Clicking outside any word clears the selection and hides the Save button
- **Description**: When the floating Save button is visible and the user clicks anywhere on the page that is not a word span (.vocab-word-span) or the Save button itself (.vocab-save-btn), the selectedWord state is set to null and saveButtonPosition is set to null, causing the Save button to animate out via AnimatePresence.
- **Verification**: (TEST)
- **Priority**: Must
- **Depends on**: ---

### REQ-002: Pressing Escape clears the selection and hides the Save button
- **Description**: When the floating Save button is visible and the user presses the Escape key, the selectedWord and saveButtonPosition states are cleared, hiding the button. This must not interfere with other Escape-bound behaviors (e.g., closing the calculator modal or the question nav overlay).
- **Verification**: (TEST)
- **Priority**: Must
- **Depends on**: ---

### REQ-003: Save button hides after a word is saved or unsaved
- **Description**: After the user clicks the Save (or Unsave) button and the word toggle completes, the selectedWord and saveButtonPosition states are cleared so the button animates out.
- **Verification**: (TEST)
- **Priority**: Must
- **Depends on**: ---

### REQ-004: Navigating between questions clears the selection
- **Description**: When the user navigates to a different question (via Next, Back, or the question nav grid), any active word selection is cleared and the Save button is hidden.
- **Verification**: (TEST)
- **Priority**: Must
- **Depends on**: ---

### REQ-005: Save button remains visible while a word is actively selected
- **Description**: When the user clicks a word span, the floating Save button appears at the correct position and remains visible as long as no dismissal trigger (REQ-001 through REQ-004) fires. Clicking the same word again does not dismiss the button.
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: ---

### REQ-006: Dismissal triggers do not interfere with answer selection or test controls
- **Description**: The click-outside listener (REQ-001) must not prevent answer option clicks, cross-out toggles, Mark for Review, navigation buttons, calculator, or directions from functioning normally.
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: REQ-001
---

## Traceability Matrix

| REQ ID  | Description                                      | Verification | Test/Check Location                                          |
|---------|--------------------------------------------------|--------------|--------------------------------------------------------------|
| REQ-001 | Click outside word clears selection               | (TEST)       | src/app/diagnosis/__tests__/vocab-dismiss.test.tsx           |
| REQ-002 | Escape key clears selection                       | (TEST)       | src/app/diagnosis/__tests__/vocab-dismiss.test.tsx           |
| REQ-003 | Save/Unsave action hides button                   | (TEST)       | src/app/diagnosis/__tests__/vocab-dismiss.test.tsx           |
| REQ-004 | Question navigation clears selection              | (TEST)       | src/app/diagnosis/__tests__/vocab-dismiss.test.tsx           |
| REQ-005 | Button stays visible while word selected          | (BROWSER)    | Playwright MCP spot-check                                    |
| REQ-006 | No interference with test controls                | (BROWSER)    | Playwright MCP spot-check                                    |

---

## Technical Approach

All changes are localized to a single file: DiagnosticTestView.tsx. No new components or hooks are needed.

### Key Design Decisions

**1. Single clearSelection helper function**

Extract a reusable callback:

```typescript
const clearSelection = useCallback(() => {
  setSelectedWord(null);
  setSaveButtonPosition(null);
}, []);
```

This is called by all four dismissal triggers, keeping the logic DRY.

**2. Click-outside detection via mousedown on document**

Use a useEffect that registers a mousedown listener on document. The handler checks whether the click target is inside a .vocab-word-span or the .vocab-save-btn. If not, call clearSelection().

Why mousedown instead of click: mousedown fires before the click event reaches interactive elements, so we can call clearSelection() without interfering with the element's own click handler. The word spans use click with stopPropagation, so a mousedown on a word span should be detected and ignored via closest('.vocab-word-span').

**3. Escape key via useEffect with keydown listener**

Register a keydown listener on document. When key === 'Escape' and selectedWord is not null, call clearSelection(). Do not call preventDefault/stopPropagation so other Escape handlers still work.

**4. Clear on save action**

Modify handleSaveWord to call clearSelection() after toggleWord(). The current comment says Keep selection visible for better UX -- this is the behavior we are intentionally changing.

**5. Clear on question navigation**

Add clearSelection() to the existing navigateToQuestion callback, after setShowNav(false).
---

## Implementation Steps

### Step 1: Extract clearSelection callback
**Files**: src/app/diagnosis/components/DiagnosticTestView.tsx
**Dependencies**: None
**Description**: Create a useCallback that sets both selectedWord and saveButtonPosition to null.
**Satisfies**: Foundation for REQ-001, REQ-002, REQ-003, REQ-004

### Step 2: Add click-outside useEffect
**Files**: src/app/diagnosis/components/DiagnosticTestView.tsx
**Dependencies**: Step 1
**Description**: Add a useEffect that registers a mousedown listener on document. The handler uses (e.target as Element).closest('.vocab-word-span, .vocab-save-btn') to determine if the click is on a word or the save button. If neither, call clearSelection(). The effect should depend on selectedWord and clearSelection -- only register the listener when a word is selected (early return when !selectedWord). Clean up on unmount.
**Satisfies**: REQ-001, REQ-006

### Step 3: Add Escape key useEffect
**Files**: src/app/diagnosis/components/DiagnosticTestView.tsx
**Dependencies**: Step 1
**Description**: Add a useEffect that registers a keydown listener on document when selectedWord is not null. On Escape, call clearSelection(). Do not call stopPropagation or preventDefault. Clean up on unmount.
**Satisfies**: REQ-002

### Step 4: Clear selection after save/unsave
**Files**: src/app/diagnosis/components/DiagnosticTestView.tsx
**Dependencies**: Step 1
**Description**: In handleSaveWord, after toggleWord(selectedWord), call clearSelection(). Remove the comment about keeping selection visible.
**Satisfies**: REQ-003

### Step 5: Clear selection on question navigation
**Files**: src/app/diagnosis/components/DiagnosticTestView.tsx
**Dependencies**: Step 1
**Description**: In navigateToQuestion, add clearSelection() call after setShowNav(false). Since navigateToQuestion uses useCallback, add clearSelection to its dependency array.
**Satisfies**: REQ-004

---

## Testing Strategy

All four dismissal triggers map to unit/integration tests using React Testing Library with mocked Framer Motion:

- **REQ-001** -> Render component, simulate word click (verify button appears), simulate mousedown on a non-word element, assert button is not in DOM.
- **REQ-002** -> Render component, simulate word click, fire keydown with key Escape, assert button is gone.
- **REQ-003** -> Render component, simulate word click, click the Save button, assert button is gone after action.
- **REQ-004** -> Render component, simulate word click, click Next button, assert button is gone.
- **REQ-005** -> Playwright MCP: navigate to test page, click a word, visually confirm button is positioned and visible.
- **REQ-006** -> Playwright MCP: with save button visible, click an answer option, confirm the answer registers and no JS errors occur.

---

## Risks and Considerations

### Event bubbling conflicts
**Risk**: The click-outside mousedown listener could fire before or after word span click handlers, causing the button to flash (appear then immediately disappear).
**Mitigation**: Word span click handlers use e.stopPropagation() on click events (see SelectableText.tsx line 88). Using mousedown on document is a different event type, so it fires independently. The .closest check ensures that mousedown on a word span does NOT trigger dismissal. Test this scenario explicitly.

### Framer Motion AnimatePresence timing
**Risk**: Clearing state instantly might skip the exit animation.
**Mitigation**: AnimatePresence already wraps the save button (lines 548-568). Setting state to null triggers the exit animation correctly because React removes the child from the tree and AnimatePresence intercepts that removal. No timing changes needed.

### Calculator / Nav overlay Escape handling
**Risk**: Pressing Escape might close both the calculator AND clear the word selection simultaneously.
**Mitigation**: This is acceptable -- clearing the vocab selection is lightweight and non-disruptive. Both can happen in parallel without confusing the user.

### SelectableText re-renders
**Risk**: clearSelection triggers a parent re-render which causes unnecessary DOM manipulation in SelectableText.
**Mitigation**: clearSelection only changes selectedWord and saveButtonPosition state. SelectableText does not receive either as props (it receives savedWords, onWordClick, content, questionId, section, optionId). So clearing the selection does not cause SelectableText to re-render. No issue.