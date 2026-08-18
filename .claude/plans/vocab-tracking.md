# Implementation Plan: Vocabulary Tracking Feature

**Author**: Architect Agent
**Date**: 2026-03-07
**Status**: Ready for Review

---

## Overview

Add a vocabulary tracking feature to the diagnostic test system that allows students to select and save unknown words encountered in test passages and answer options. Saved words are persisted with the test result for later vocabulary building. This feature integrates into the existing Bluebook-style test UI without disrupting the test-taking flow.

---

## Requirements

### REQ-001: Initial Instruction Notice
- **Priority**: Should
- **Description**: Display a dismissible instruction notice when the test starts, explaining that students can click unknown words and press "Save" to mark them for vocabulary building.
- **Acceptance Criteria**: After clicking "Start Test," a brief instruction banner or toast appears at the top of the test area with the text "Click any unknown word in the passage or options, then press 'Save' to mark it for vocabulary building." The notice can be dismissed and does not reappear after dismissal.
- **Verification**: (BROWSER)
- **Depends on**: —

### REQ-002: Word Selection via Click
- **Priority**: Must
- **Description**: Students can click on individual words in the passage panel and in multiple-choice option text. Clicking a word highlights it with a visible selection indicator (e.g., light blue background) and shows a floating "Save" button near the selected word.
- **Acceptance Criteria**: Clicking any word in the passage or option text visually highlights that word and a "Save" button appears. Clicking elsewhere or pressing Escape deselects the word and hides the button. Only one word can be selected at a time.
- **Verification**: (BROWSER)
- **Depends on**: —

### REQ-003: Save Word Toggle
- **Priority**: Must
- **Description**: Pressing the "Save" button on a selected word adds it to the saved words list. A previously saved word is visually distinguished (dotted underline, subtle color). Selecting a saved word and pressing the Save button again removes it from the list (toggle behavior).
- **Acceptance Criteria**: Saving a word adds dotted underline styling. Re-selecting a saved word shows "Unsave" button text instead of "Save." Clicking Unsave removes the styling and the word from the list.
- **Verification**: (BROWSER)
- **Depends on**: REQ-002

### REQ-004: Saved Words Visual Persistence Across Questions
- **Priority**: Must
- **Description**: When navigating between questions, saved words in passage text and option text remain visually marked (dotted underline) for any question the student revisits.
- **Acceptance Criteria**: Save a word on question 1, navigate to question 2, navigate back to question 1 -- the saved word still shows the dotted underline.
- **Verification**: (TEST)
- **Depends on**: REQ-003

### REQ-005: Saved Words State Hook
- **Priority**: Must
- **Description**: Create a custom React hook `useVocabTracker` that manages the saved words state as an array of `SavedWord` objects. Each object tracks: `word` (string), `questionId` (string), `section` ("passage" | "option"), `optionId` (string | null), `positionIndex` (number -- word index in the text).
- **Acceptance Criteria**: The hook exposes `savedWords`, `toggleWord(word)`, and `isWordSaved(word)` functions. State is maintained via `useState` and survives question navigation within the same test session.
- **Verification**: (TEST)
- **Depends on**: —

### REQ-006: Include Saved Words in Submission Payload
- **Priority**: Must
- **Description**: Extend `SubmitTestRequest` and the submission flow in `DiagnosticTestView` to include the `savedWords` array in the API payload sent to `/api/diagnosis/submit`.
- **Acceptance Criteria**: The `savedWords` field is included in the JSON body of the POST request. The API route extracts and stores it.
- **Verification**: (TEST)
- **Depends on**: REQ-005

### REQ-007: API Route Accepts and Stores Saved Words
- **Priority**: Must
- **Description**: Update the `/api/diagnosis/submit` route handler to accept the optional `savedWords` JSONB field and pass it to the Supabase insert.
- **Acceptance Criteria**: The API accepts `savedWords` in the request body and includes it in the `diagnostic_test_results` insert. If `savedWords` is missing or empty, it defaults to an empty array `[]`.
- **Verification**: (TEST)
- **Depends on**: REQ-006

### REQ-008: Database Schema Extension
- **Priority**: Must
- **Description**: Add a `saved_words JSONB DEFAULT '[]'::jsonb` column to the `diagnostic_test_results` table via a new migration file. The JSONB field stores an array of objects with shape `{ word, questionId, section, optionId, positionIndex }`.
- **Acceptance Criteria**: The migration runs without error. The column exists with a default of `[]`. Existing rows are not affected.
- **Verification**: (TEST)
- **Depends on**: —

### REQ-009: Word Selection Does Not Interfere with Answer Selection
- **Priority**: Must
- **Description**: Clicking a word inside an option text must not trigger the answer selection handler. The word selection and answer selection must be independent interactions.
- **Acceptance Criteria**: Clicking a word in an option highlights the word but does not select/change the answer for that question. Clicking the option outside of a specific word (or on the option label letter) still selects the answer as before.
- **Verification**: (BROWSER)
- **Depends on**: REQ-002

### REQ-010: SelectableText Component
- **Priority**: Must
- **Description**: Create a `SelectableText` wrapper component that renders text content (HTML string) with individual words wrapped in clickable spans. This component replaces direct `ContentRenderer` usage in passage and option text areas.
- **Acceptance Criteria**: The component renders the same visual output as `ContentRenderer` but each word is individually clickable. It accepts callbacks for word click and a set of saved words for visual distinction.
- **Verification**: (TEST)
- **Depends on**: —

---

## Traceability Matrix

| REQ ID  | Description                              | Verification | Test/Check Location                                      |
|---------|------------------------------------------|--------------|----------------------------------------------------------|
| REQ-001 | Initial instruction notice               | (BROWSER)    | Playwright spot-check                                    |
| REQ-002 | Word selection via click                  | (BROWSER)    | Playwright spot-check                                    |
| REQ-003 | Save word toggle                         | (BROWSER)    | Playwright spot-check                                    |
| REQ-004 | Saved words persist across navigation    | (TEST)        | `src/app/diagnosis/hooks/__tests__/useVocabTracker.test.ts` |
| REQ-005 | useVocabTracker hook                     | (TEST)        | `src/app/diagnosis/hooks/__tests__/useVocabTracker.test.ts` |
| REQ-006 | Saved words in submission payload        | (TEST)        | `src/app/diagnosis/__tests__/submit-payload.test.ts`     |
| REQ-007 | API route accepts saved words            | (TEST)        | `src/app/api/diagnosis/__tests__/submit.test.ts`         |
| REQ-008 | Database schema extension                | (TEST)        | Migration file validation                                |
| REQ-009 | Word click does not trigger answer       | (BROWSER)    | Playwright spot-check                                    |
| REQ-010 | SelectableText component                 | (TEST)        | `src/app/diagnosis/components/__tests__/SelectableText.test.tsx` |

---

## Technical Design

### Architecture

The feature introduces three new files and modifies four existing files:

**New files:**
1. `src/app/diagnosis/hooks/useVocabTracker.ts` -- Custom hook managing saved words state
2. `src/app/diagnosis/components/SelectableText.tsx` -- Word-level clickable text wrapper
3. `supabase/migrations/002_add_saved_words.sql` -- Database migration

**Modified files:**
1. `src/types/diagnosis.ts` -- Add `SavedWord` interface and extend `SubmitTestRequest`
2. `src/app/diagnosis/components/DiagnosticTestView.tsx` -- Integrate hook, notice, and SelectableText
3. `src/app/diagnosis/components/ContentRenderer.tsx` -- Minor: export `processContent` utility for reuse
4. `src/app/api/diagnosis/submit/route.ts` -- Accept and store `savedWords`

### Key Technical Decisions

**Word Selection Mechanism**: The `SelectableText` component parses HTML content, splits text nodes into individual word spans, and attaches click handlers. It preserves all HTML structure (bold, italic, math, images) while making plain text words clickable. This approach avoids modifying `ContentRenderer` internals -- instead, `SelectableText` wraps rendered output and applies word-level interactivity via DOM manipulation in a `useEffect`.

**Event Propagation for REQ-009**: Word clicks inside option text use `event.stopPropagation()` to prevent the click from bubbling up to the option button's `onClick` handler. This cleanly separates word selection from answer selection.

**Floating Save Button**: Implemented as an absolutely positioned small button that appears near the clicked word using the word element's `getBoundingClientRect()`. This avoids layout shifts and keeps the UI clean.

**CSS Approach for Saved Words**: Saved words receive a CSS class `vocab-saved` with styles: `border-bottom: 2px dotted #3182F6; cursor: pointer;`. No animations. The styling is applied via the `SelectableText` component which checks each word against the saved set.

**SavedWord Data Shape**:
```typescript
interface SavedWord {
  word: string;           // The word text (lowercased, trimmed)
  questionId: string;     // Which question it was found in
  section: 'passage' | 'option';  // Where in the UI
  optionId: string | null;        // If from an option, which one
  positionIndex: number;          // Word index in the source text
}
```

### Dependencies

- No new external dependencies required
- Uses existing React hooks, Supabase client, and CSS

---

## Implementation Steps

### Step 1: Database Migration
**Files**: `supabase/migrations/002_add_saved_words.sql`
**Dependencies**: None
**Complexity**: Low
**Description**: Add `saved_words` JSONB column to `diagnostic_test_results` with default `'[]'::jsonb`. This is a safe additive migration (nullable column with default).

**Satisfies**: REQ-008

```sql
ALTER TABLE diagnostic_test_results
ADD COLUMN IF NOT EXISTS saved_words JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_test_results_saved_words
ON diagnostic_test_results USING GIN (saved_words);
```

---

### Step 2: Type Definitions
**Files**: `src/types/diagnosis.ts`
**Dependencies**: None (can run in parallel with Step 1)
**Complexity**: Low
**Description**: Add `SavedWord` interface. Add optional `savedWords?: SavedWord[]` field to `SubmitTestRequest` and `TestResult`.

**Satisfies**: REQ-006 (partial)

---

### Step 3: useVocabTracker Hook
**Files**: `src/app/diagnosis/hooks/useVocabTracker.ts`
**Dependencies**: Step 2 (needs `SavedWord` type)
**Complexity**: Medium
**Description**: Implement the custom hook with:
- `savedWords: SavedWord[]` state
- `toggleWord(word: SavedWord): void` -- adds if not present, removes if present (match by word + questionId + positionIndex)
- `isWordSaved(word: string, questionId: string, positionIndex: number): boolean`
- `getWordsForQuestion(questionId: string): SavedWord[]` -- filter helper

**Satisfies**: REQ-005, REQ-004

---

### Step 4: SelectableText Component
**Files**: `src/app/diagnosis/components/SelectableText.tsx`
**Dependencies**: Step 2 (needs `SavedWord` type), Step 3 (needs hook interface knowledge)
**Complexity**: High
**Description**: Create a component that:
1. Receives `content` (HTML string), `questionId`, `section`, `optionId`, `savedWords`, `onWordClick` props
2. Renders content using `ContentRenderer` internally
3. In a `useEffect`, walks the rendered DOM text nodes, wraps each word in a `<span>` with a click handler
4. Applies `vocab-saved` class to words matching the saved set
5. On word click, calls `onWordClick` with word metadata and the clicked element's position (for floating button placement)
6. Uses `event.stopPropagation()` on word clicks
7. Skips KaTeX math elements from word selection

**Satisfies**: REQ-010, REQ-002 (partial), REQ-009

---

### Step 5: Integrate into DiagnosticTestView
**Files**: `src/app/diagnosis/components/DiagnosticTestView.tsx`
**Dependencies**: Steps 3, 4
**Complexity**: High
**Description**:
1. Import and use `useVocabTracker` hook
2. Add state for `selectedWord` (the currently clicked-but-not-yet-saved word) and `saveButtonPosition`
3. Add dismissible instruction notice (visible on first question load, hidden after dismiss; use local state `showVocabNotice`)
4. Replace `ContentRenderer` with `SelectableText` in:
   - Passage panel (section="passage")
   - Option text (section="option", optionId=option.id)
5. Render floating "Save"/"Unsave" button when a word is selected
6. Pass `savedWords` array to `handleSubmit` along with existing data
7. Add CSS styles for `.vocab-saved` and the floating save button

**Satisfies**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-006, REQ-009

---

### Step 6: Update API Route
**Files**: `src/app/api/diagnosis/submit/route.ts`
**Dependencies**: Step 2
**Complexity**: Low
**Description**: Extract `savedWords` from the request body. Include `saved_words: savedWords || []` in the Supabase insert object. No validation beyond default to empty array (the field is optional).

**Satisfies**: REQ-007

---

## Testing Strategy

### Unit Tests (TEST verification tag)

| REQ ID  | Test File                                                      | Test Case                                                |
|---------|----------------------------------------------------------------|----------------------------------------------------------|
| REQ-004 | `src/app/diagnosis/hooks/__tests__/useVocabTracker.test.ts`    | Save word on Q1, navigate to Q2, back to Q1, verify persists |
| REQ-005 | `src/app/diagnosis/hooks/__tests__/useVocabTracker.test.ts`    | toggleWord adds/removes, isWordSaved checks correctly    |
| REQ-006 | `src/app/diagnosis/__tests__/submit-payload.test.ts`           | savedWords included in constructed payload               |
| REQ-007 | `src/app/api/diagnosis/__tests__/submit.test.ts`               | API accepts savedWords, defaults to [] when missing      |
| REQ-008 | Migration file validation                                       | Run migration, verify column exists with default         |
| REQ-010 | `src/app/diagnosis/components/__tests__/SelectableText.test.tsx` | Renders words as clickable, applies saved class         |

### Browser Tests (BROWSER verification tag)

| REQ ID  | Verification Steps                                                |
|---------|-------------------------------------------------------------------|
| REQ-001 | Start test, verify notice banner appears, dismiss it, verify gone |
| REQ-002 | Click word in passage, verify highlight and Save button appear    |
| REQ-003 | Click Save, verify underline appears. Select saved word again, verify Unsave button |
| REQ-009 | Click word inside option, verify word highlighted but answer unchanged |

---

## Implementation Order

1. **REQ-008** (Step 1) -- Database migration first, no code dependencies
2. **REQ-005** (Steps 2-3) -- Types and hook, foundation for everything else
3. **REQ-010** (Step 4) -- SelectableText component, depends on types
4. **REQ-001, REQ-002, REQ-003, REQ-004, REQ-009** (Step 5) -- Integration, depends on hook + component
5. **REQ-006, REQ-007** (Steps 5-6) -- Submission flow, depends on types

**Parallelization opportunity**: Steps 1, 2 can run in parallel. Steps 3, 4 can run in parallel after Step 2. Step 6 can run in parallel with Step 5.

---

## Risks and Considerations

### Risk 1: ContentRenderer uses dangerouslySetInnerHTML
**Impact**: High
**Mitigation**: The `SelectableText` component uses a `useEffect` + DOM walking approach post-render. It finds text nodes in the rendered DOM, wraps each word in a `<span>`, and attaches vanilla DOM event listeners. This works with any HTML content including math expressions. The component cleans up listeners on unmount/re-render.

### Risk 2: Math expressions should not be word-selectable
**Impact**: Medium
**Mitigation**: The DOM walker in `SelectableText` skips elements with class `katex` or `katex-display`. Only plain text nodes outside math containers are made selectable.

### Risk 3: Event propagation conflicts with option click
**Impact**: High
**Mitigation**: `event.stopPropagation()` on the word span click handler. This is explicitly tested in REQ-009.

### Risk 4: Performance with large passages
**Impact**: Low-Medium
**Mitigation**: The DOM walking runs in `useEffect` only when `content` or `questionId` changes (not on every render). Word count in SAT passages is typically under 500 words, well within performance bounds.

### Risk 5: Word deduplication
**Impact**: Low
**Mitigation**: Each `SavedWord` includes `positionIndex` (the word's ordinal position in the text) to uniquely identify each occurrence. The `isWordSaved` check uses word + questionId + positionIndex as a composite key.

---

## Out of Scope

- Vocabulary review/study screen (separate feature)
- Spaced repetition or flashcard system for saved words
- Dictionary/definition lookup for selected words
- Vocabulary analytics or reporting dashboard
- Sharing saved words across test sessions
- Word frequency analysis

---

## Implementation Notes

**Key files relevant to this plan:**
- `src/app/diagnosis/components/DiagnosticTestView.tsx` -- main integration point (544 lines; the SelectableText extraction helps modularize)
- `src/app/diagnosis/components/ContentRenderer.tsx` -- current text rendering, uses dangerouslySetInnerHTML
- `src/app/api/diagnosis/submit/route.ts` -- API endpoint to extend
- `src/types/diagnosis.ts` -- type definitions to extend
- `supabase/migrations/001_create_diagnostic_tests.sql` -- existing schema showing current `diagnostic_test_results` table structure
