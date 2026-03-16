# Spec: Fix — 진단 테스트 divider 스크롤 문제

## Root Cause

`page.tsx` test-active wrapper uses `minHeight: calc(100vh - 56px)`.
`min-height` allows the container to grow when content is tall → page scrolls →
`.test-resizer` divider scrolls with the page.

## Fix

Change `minHeight` → `height` + `overflow: hidden`.
This locks the wrapper to exactly the visible viewport below the nav header.
The two panels (`.test-passage-panel`, `.test-question-panel`) already have
`overflow-y: auto` so they scroll independently inside the fixed container.
`.test-layout` already has `overflow: hidden`.

## Requirements

### REQ-001: Divider stays fixed during scroll (BROWSER)
- `.test-resizer` must not move when passage or question panel scrolls
- Both panels must scroll independently within their fixed bounds

## Files to Change

`src/app/diagnosis/page.tsx` — test-active wrapper only:

```
minHeight: 'calc(100vh - 56px)', paddingTop: '56px'
→
height: 'calc(100vh - 56px)', marginTop: '56px', overflow: 'hidden'
```
