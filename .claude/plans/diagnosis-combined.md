# Diagnostic Test UI Refinement & Question Management

**Author**: System
**Date**: 2026-03-07
**Status**: Ready for Implementation

---

## Overview

Two integrated improvements to the diagnostic test system:

### Part 1: UI Refinement
Fix layout and rendering issues in the Bluebook-style diagnostic test UI to ensure:
- Consistent footer position (Next/Submit button always visible)
- Fixed height question panels with internal scrolling
- Optimized image sizing
- Centered timer display
- Removed unnecessary UI elements

### Part 2: Question Management
Enable admins to manage test questions:
- View all 25 questions with metadata (difficulty, type, time estimates)
- Flag questions as too easy/too hard for analysis
- Replace problematic questions with alternatives from a question bank
- Track question performance metrics

---

## Requirements

### PART 1: UI REFINEMENT

#### REQ-001: Footer bar position fixed
- **Description**: The Next/Submit button bar remains at the bottom of the viewport and does not move based on question content length
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

#### REQ-002: Question panel with internal scrolling
- **Description**: When question content exceeds available space, a scrollbar appears inside the question panel (not page scroll)
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: REQ-001

#### REQ-003: Question images sized appropriately
- **Description**: Images in questions have max-width constraints and do not exceed container boundaries
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

#### REQ-004: Timer centered in header
- **Description**: The countdown timer (HH:MM:SS) is visually centered in the bluebook-header-center area, not left-aligned
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

#### REQ-005: Remove section label from header
- **Description**: "Section 1, Module 1: Reading and Writing" text is removed from the left side of the header
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

#### REQ-006: Remove notes and more buttons
- **Description**: "Notes" and "More" icon buttons in header are removed
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

#### REQ-007: No layout breaks across all questions
- **Description**: All 25 test questions render without visual breakage (text overflow, misaligned elements, clipped images)
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: REQ-002, REQ-003

---

### PART 2: QUESTION MANAGEMENT

#### REQ-008: Admin can view all test questions
- **Description**: `/admin/diagnosis/questions` page displays all 25 questions with question text, type, difficulty level, estimated time
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

#### REQ-009: Flag questions as problematic
- **Description**: Admin can mark a question as "Too Easy", "Too Hard", or "Problematic" with optional notes
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: REQ-008

#### REQ-010: Replace question in active test
- **Description**: Admin selects a problematic question and replaces it with an alternative from the question bank, automatically updating all future test instances
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: REQ-009

#### REQ-011: Question bank management
- **Description**: `/admin/diagnosis/question-bank` allows admin to add new questions or mark existing ones as alternatives
- **Verification**: (BROWSER)
- **Priority**: Should
- **Depends on**: —

#### REQ-012: Track question performance metrics
- **Description**: Admin can view statistics for each question: answer distribution, average time spent, difficulty rating from students, flagged count
- **Verification**: (BROWSER)
- **Priority**: Should
- **Depends on**: REQ-008

---

## Traceability Matrix

| REQ ID  | Description                    | Verification | File Location |
|---------|--------------------------------|-------------|---------------------|
| REQ-001 | Footer position fixed          | (BROWSER)   | Manual check         |
| REQ-002 | Internal scrolling in question | (BROWSER)   | Manual check         |
| REQ-003 | Image sizing constraints       | (BROWSER)   | Manual check         |
| REQ-004 | Timer centered                 | (BROWSER)   | Manual check         |
| REQ-005 | Section label removed          | (BROWSER)   | Manual check         |
| REQ-006 | Notes/More buttons removed     | (BROWSER)   | Manual check         |
| REQ-007 | No layout breaks all questions | (BROWSER)   | Manual check         |
| REQ-008 | View all test questions        | (BROWSER)   | `/admin/diagnosis/questions` |
| REQ-009 | Flag questions as problematic  | (BROWSER)   | `/admin/diagnosis/questions` |
| REQ-010 | Replace question in test       | (BROWSER)   | `/admin/diagnosis/questions` |
| REQ-011 | Question bank management       | (BROWSER)   | `/admin/diagnosis/question-bank` |
| REQ-012 | Track performance metrics      | (BROWSER)   | `/admin/diagnosis/questions` |

---

## Technical Design

### Part 1: UI Refinement

#### Current Issues
1. **Footer float**: `.bluebook-footer` has no `position: fixed`, causing it to shift when question content is tall
2. **No internal scrolling**: Question panel padding-bottom (120px) reserves space but doesn't scroll
3. **Image sizing**: No max-width constraints on images in `.test-passage-content` and question content
4. **Timer alignment**: `.bluebook-header-center` has `display: flex` but may not be properly centered
5. **Unnecessary elements**: Section label span (lines 257-260) and "Notes"/"More" buttons (lines 298-307) present

#### Files to Modify
1. `src/app/globals.css` — Update `.bluebook-footer`, `.test-question-panel`, add image constraints
2. `src/app/diagnosis/components/DiagnosticTestView.tsx` — Remove section label and icon buttons

---

### Part 2: Question Management

#### Database Changes
New table: `diagnostic_test_questions`
```sql
CREATE TABLE diagnostic_test_questions (
  id UUID PRIMARY KEY,
  test_id VARCHAR(100),
  question_order INTEGER,
  question_id VARCHAR(100),
  difficulty ENUM('easy', 'medium', 'hard'),
  is_flagged BOOLEAN,
  flag_reason VARCHAR(100),
  flag_notes TEXT,
  replacement_id UUID REFERENCES diagnostic_test_questions(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### New Files/Components
1. `src/app/admin/diagnosis/questions/page.tsx` — Question list & management UI
2. `src/app/admin/diagnosis/questions/components/QuestionCard.tsx` — Individual question display
3. `src/app/admin/diagnosis/questions/components/FlagQuestionModal.tsx` — Flag/note interface
4. `src/app/admin/diagnosis/questions/components/ReplaceQuestionModal.tsx` — Replace UI with bank selection
5. `src/app/admin/diagnosis/question-bank/page.tsx` — Question bank management
6. `src/app/api/admin/diagnosis/questions/route.ts` — GET/PATCH endpoints
7. `src/app/api/admin/diagnosis/questions/[id]/flag/route.ts` — Flag question endpoint
8. `src/app/api/admin/diagnosis/questions/[id]/replace/route.ts` — Replace question endpoint
9. `src/app/api/admin/diagnosis/question-bank/route.ts` — Question bank endpoints

#### Architecture
```
Admin Diagnosis Section:
├── /admin/diagnosis
│   ├── /questions (manage active questions)
│   ├── /question-bank (manage alternatives)
│   └── /results (view test results)
```

---

## Implementation Order

### PHASE 1: UI Refinement (3 tasks) — 1.5 hours

**Step 1: CSS Modifications** — 30 min
- Update `.bluebook-footer` to `position: fixed`
- Adjust main layout padding to account for fixed footer
- Add internal scrolling to `.test-question-panel`
- Add max-width constraints to images
- Center `.bluebook-header-center`

**Files**: `src/app/globals.css`

**Satisfies**: REQ-001, REQ-002, REQ-003, REQ-004

---

**Step 2: Component Changes (DiagnosticTestView)** — 15 min
- Remove section label span (lines 257-260)
- Remove "Notes" button (lines 298-307)
- Verify "More" button doesn't exist or remove if present

**Files**: `src/app/diagnosis/components/DiagnosticTestView.tsx`

**Satisfies**: REQ-005, REQ-006

---

**Step 3: Visual Testing & Verification** — 45 min
- Navigate through all 25 questions
- Check for layout breaks, overflow issues
- Verify footer always visible
- Verify internal scroll appears for tall content
- Test on mobile (320px) and desktop (1440px)

**Satisfies**: REQ-007

---

### PHASE 2: Question Management (2 tasks) — 3.5 hours

**Step 4: Database & API Layer** — 1.5 hours
- Create migration for `diagnostic_test_questions` table
- Implement GET `/api/admin/diagnosis/questions` (list all)
- Implement PATCH `/api/admin/diagnosis/questions/[id]/flag` (flag question)
- Implement POST `/api/admin/diagnosis/questions/[id]/replace` (replace question)
- Implement GET/POST `/api/admin/diagnosis/question-bank` (manage alternatives)

**Files**:
- `supabase/migrations/002_create_diagnostic_question_management.sql`
- `src/app/api/admin/diagnosis/questions/route.ts`
- `src/app/api/admin/diagnosis/questions/[id]/flag/route.ts`
- `src/app/api/admin/diagnosis/questions/[id]/replace/route.ts`
- `src/app/api/admin/diagnosis/question-bank/route.ts`

**Satisfies**: REQ-008, REQ-009, REQ-010

**Dependencies**: Part 1 complete

---

**Step 5: Admin UI Components** — 2 hours
- Create `/admin/diagnosis/questions` page with:
  - Question list (all 25 questions)
  - Question card showing difficulty, type, time estimate
  - Flag button → FlagQuestionModal
  - Replace button → ReplaceQuestionModal
- Create `/admin/diagnosis/question-bank` page with:
  - Add new question form
  - Alternative question list
  - Mark as alternative UI

**Files**:
- `src/app/admin/diagnosis/questions/page.tsx`
- `src/app/admin/diagnosis/questions/components/QuestionCard.tsx`
- `src/app/admin/diagnosis/questions/components/FlagQuestionModal.tsx`
- `src/app/admin/diagnosis/questions/components/ReplaceQuestionModal.tsx`
- `src/app/admin/diagnosis/question-bank/page.tsx`

**Satisfies**: REQ-011, REQ-012

**Dependencies**: Step 4 complete

---

## Testing Strategy

### Visual Testing (Manual)
- REQ-001 → Scroll through questions, verify footer stays at bottom
- REQ-002 → Enter a long question, verify internal scrollbar appears
- REQ-003 → Check images don't overflow on mobile/desktop
- REQ-004 → Verify timer is centered (not left-aligned)
- REQ-005, REQ-006 → Verify removed text/buttons don't appear
- REQ-007 → Navigate all 25 questions, check no visual breaks

### Functional Testing (Browser)
- REQ-008 → Admin can access `/admin/diagnosis/questions`, see all 25 questions
- REQ-009 → Admin can click flag button, see modal, save flag with reason
- REQ-010 → Admin can replace question, see updated test
- REQ-011 → Admin can access question bank, add/edit questions
- REQ-012 → Admin can view question stats (answer distribution, avg time)

---

## Risks & Considerations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Question replacement affects students mid-test | Medium | Only replace for future tests, not in-progress |
| CSS changes break responsive layout | Medium | Test on 5+ screen sizes (320px, 480px, 768px, 1024px, 1440px) |
| Performance with 25+ questions in list | Low | Pagination if needed (show 10 per page initially) |
| Image sizing breaks specific formatting | Low | Use max-width with aspect-ratio constraints |
| Database migration conflicts | Low | Increment migration number (002), test locally first |
| Admin accidentally replaces wrong question | Medium | Confirmation modal before replace |

---

## Out of Scope

- Changes to question content (only management structure)
- Automated difficulty rating (manual flagging only)
- Student feedback integration (future enhancement)
- Bulk question import (future enhancement)
- Question scheduling or A/B testing
- Animation or transition timing adjustments on original UI

---

## Implementation Timeline

```
Total Estimated Time: ~5 hours

Phase 1 (UI Refinement):     1.5 hours
├─ Step 1 (CSS):            30 min
├─ Step 2 (Component):      15 min
└─ Step 3 (Testing):        45 min

Phase 2 (Question Mgmt):     3.5 hours
├─ Step 4 (DB/API):         1.5 hours
└─ Step 5 (UI):             2 hours
```
