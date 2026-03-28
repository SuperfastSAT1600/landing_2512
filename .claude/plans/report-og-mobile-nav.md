# Report OG Image + Mobile Nav Button Size

## Overview
Two UI fixes for the report page:
1. OG thumbnail shows blank name/score (params not awaited in Next.js 16)
2. Mobile bottom tab buttons are too small (fontSize: 11, padding: 10)

## Requirements

### REQ-001: Fix OG image params awaiting
- **Description**: `opengraph-image.tsx` receives `params` as Promise in Next.js 16 but doesn't await it, so `resultId` is undefined → `fetchReportData(undefined)` returns null → shows `—` and `0%`
- **Fix**: Add `params: Promise<{ resultId: string }>` type and `await params`
- **Verification**: (MANUAL) Share report URL on KakaoTalk/Twitter and verify thumbnail shows student name + score

### REQ-002: Increase mobile nav button size
- **Description**: Mobile bottom tab buttons have `fontSize: 11` and `paddingTop/Bottom: 10` — too small to read
- **Fix**: Increase to `fontSize: 13`, `paddingTop/Bottom: 14`
- **Verification**: (BROWSER) Check mobile view — buttons clearly readable

## Files
- `src/app/reports/[resultId]/opengraph-image.tsx` — await params
- `src/app/reports/[resultId]/components/ChapterNav.tsx` — increase padding/font
