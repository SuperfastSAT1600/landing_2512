# Diagnostic Test UI Refinement

**Author**: System
**Date**: 2026-03-06
**Status**: Draft

---

## Overview

Fix layout and rendering issues in the Bluebook-style diagnostic test UI to ensure:
- Consistent footer position (Next/Submit button always visible)
- Fixed height question panels with internal scrolling
- Optimized image sizing
- Centered timer display
- Removed unnecessary UI elements

This improves usability by preventing layout shifts and ensuring navigation is always accessible.

---

## Requirements

### REQ-001: Footer bar position fixed (not float with content)
- **Description**: The Next/Submit button bar remains at the bottom of the viewport and does not move based on question content length
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

### REQ-002: Question panel with internal scrolling
- **Description**: When question content exceeds available space, a scrollbar appears inside the question panel (not page scroll)
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: REQ-001

### REQ-003: Question images sized appropriately
- **Description**: Images in questions have max-width constraints and do not exceed container boundaries
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

### REQ-004: Timer centered in header
- **Description**: The countdown timer (HH:MM:SS) is visually centered in the bluebook-header-center area, not left-aligned
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

### REQ-005: Remove section label from header
- **Description**: "Section 1, Module 1: Reading and Writing" text is removed from the left side of the header
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

### REQ-006: Remove notes and more buttons
- **Description**: "Notes" and "More" icon buttons in header are removed
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

### REQ-007: No layout breaks across all question types
- **Description**: All 25 test questions render without visual breakage (text overflow, misaligned elements, clipped images)
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: REQ-002, REQ-003

---

## Traceability Matrix

| REQ ID  | Description                    | Verification | Test/Check Location |
|---------|--------------------------------|-------------|---------------------|
| REQ-001 | Footer position fixed          | (BROWSER)   | Manual page check   |
| REQ-002 | Internal scrolling in question | (BROWSER)   | Manual page check   |
| REQ-003 | Image sizing constraints       | (BROWSER)   | Manual page check   |
| REQ-004 | Timer centered                 | (BROWSER)   | Manual page check   |
| REQ-005 | Section label removed          | (BROWSER)   | Manual page check   |
| REQ-006 | Notes/More buttons removed     | (BROWSER)   | Manual page check   |
| REQ-007 | No layout breaks all questions | (BROWSER)   | Manual page check   |

---

## Technical Design

### Current Issues

1. **Footer float**: `.bluebook-footer` has no `position: fixed`, causing it to shift when question content is tall
2. **No internal scrolling**: Question panel padding-bottom (120px) reserves space but doesn't scroll
3. **Image sizing**: No max-width constraints on images in `.test-passage-content` and question content
4. **Timer alignment**: `.bluebook-header-center` has `display: flex` but may not be properly centered
5. **Unnecessary elements**: Section label span (lines 257-260) and "Notes"/"More" buttons (lines 298-307) present

### Files to Modify

1. `src/app/globals.css` — Update `.bluebook-footer`, `.test-question-panel`, add image constraints
2. `src/app/diagnosis/components/DiagnosticTestView.tsx` — Remove section label and icon buttons

### Architecture

**Layout Structure**:
```
<div class="flex flex-col h-full">
  ← Header (flex-shrink: 0)
  ← Main content area (flex: 1, overflow: hidden)
    ← Passage panel (if present)
    ← Question panel (flex: 1, overflow-y: auto) ← *scrolls internally*
  ← Footer (position: fixed, bottom: 0) ← *always visible*
  ← Calculator modal
</div>
```

---

## Implementation Order

### Step 1: CSS Modifications
- Update `.bluebook-footer` to `position: fixed`
- Adjust main layout padding to account for fixed footer
- Add internal scrolling to `.test-question-panel`
- Add max-width constraints to images
- Center `.bluebook-header-center`

**Satisfies**: REQ-001, REQ-002, REQ-003, REQ-004

### Step 2: Component Changes (DiagnosticTestView)
- Remove section label span (lines 257-260)
- Remove "Notes" button (lines 298-307)
- Verify "More" button doesn't exist or remove if present

**Satisfies**: REQ-005, REQ-006

### Step 3: Visual Testing
- Navigate through all 25 questions
- Check for layout breaks, overflow issues
- Verify footer always visible
- Verify internal scroll appears for tall content
- Test on mobile (320px) and desktop (1440px)

**Satisfies**: REQ-007

---

## Out of Scope

- Changes to question content or styling (only layout)
- Changes to functionality (submission, navigation, timing)
- Responsive design overhaul (only layout fixes)
- Animation or transition timing adjustments
